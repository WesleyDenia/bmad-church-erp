<?php

namespace Tests\Feature\Finance;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Services\CreateFinancialEntryService;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StoreFinancialEntryTest extends TestCase
{
    use RefreshDatabase;

    private static ?string $devInternalJwtPrivateKey = null;

    private static function devInternalJwtPrivateKey(): string
    {
        if (self::$devInternalJwtPrivateKey === null) {
            $privateKey = openssl_pkey_new([
                'private_key_bits' => 2048,
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
            ]);

            if ($privateKey === false || ! openssl_pkey_export($privateKey, $pem)) {
                throw new \RuntimeException('Unable to generate the internal JWT private key used by the test suite.');
            }

            self::$devInternalJwtPrivateKey = $pem;
        }

        return self::$devInternalJwtPrivateKey;
    }

    protected function setUp(): void
    {
        parent::setUp();

        $privateKey = openssl_pkey_get_private(self::devInternalJwtPrivateKey());

        if ($privateKey === false) {
            $this->fail('Unable to load the internal JWT private key used by the test suite.');
        }

        $details = openssl_pkey_get_details($privateKey);

        if (! is_array($details) || ! isset($details['key']) || ! is_string($details['key'])) {
            $this->fail('Unable to derive the internal JWT public key used by the test suite.');
        }

        config()->set('services.internal_jwt.public_key', $details['key']);
    }

    public function test_it_stores_a_financial_entry_for_the_authenticated_treasurer(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.entry_type', 'income')
            ->assertJsonPath('data.amount', '125.40')
            ->assertJsonPath('data.financial_category_id', $category->id)
            ->assertJsonPath('data.counterparty_id', $counterparty->id)
            ->assertJsonPath('data.counterparty_name', 'Maria Souza')
            ->assertJsonPath('data.cost_center_name', 'Cultos de domingo')
            ->assertJsonPath('data.message', 'Lancamento salvo com sucesso.')
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'entry_type',
                    'amount',
                    'financial_category_id',
                    'counterparty_id',
                    'counterparty_name',
                    'cost_center_name',
                    'created_at',
                    'message',
                ],
            ]);

        $this->assertDatabaseHas('financial_entries', [
            'church_id' => $church->id,
            'entry_type' => 'income',
            'amount' => '125.40',
            'financial_category_id' => $category->id,
            'counterparty_id' => $counterparty->id,
            'counterparty_name' => 'Maria Souza',
            'cost_center_name' => 'Cultos de domingo',
        ]);
    }

    public function test_it_requires_the_minimum_contract_fields(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/entries', []);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Revise os campos obrigatorios e tente novamente.')
            ->assertJsonValidationErrors([
                'entry_type',
                'amount',
                'financial_category_id',
                'counterparty_id',
                'cost_center_name',
            ]);
    }

    public function test_it_requires_an_authenticated_session(): void
    {
        $response = $this->postJson('/api/v1/finance/entries', [
            'entry_type' => 'income',
            'amount' => '125.40',
            'financial_category_id' => 1,
            'counterparty_id' => 1,
            'cost_center_name' => 'Cultos de domingo',
        ]);

        $response
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sessao invalida. Entre novamente.');
    }

    public function test_it_requires_explicit_treasury_access(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lideranca@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');
    }

    public function test_it_blocks_entry_validation_feedback_for_users_without_treasury_access(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lideranca@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');
        $category = $this->createCategory($otherChurch->id, 'Oferta livre', 'oferta-livre', 'income');
        $counterparty = $this->createCounterparty($otherChurch->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.')
            ->assertJsonMissingPath('errors');
    }

    public function test_it_rejects_categories_from_another_tenant(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');
        $category = $this->createCategory($otherChurch->id, 'Oferta livre', 'oferta-livre', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['financial_category_id']);

        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_it_rejects_a_category_with_the_wrong_kind_for_the_entry_type(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Acao social', 'acao-social', 'expense');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['financial_category_id']);

        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_it_rejects_payload_fields_outside_the_mvp_contract(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
                'church_id' => 999,
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Envie apenas os campos do lancamento rapido.')
            ->assertJsonValidationErrors(['payload']);

        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_it_rejects_counterparties_from_another_tenant(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($otherChurch->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['counterparty_id']);

        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_it_rejects_payload_fields_outside_the_updated_contract(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/entries', [
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'counterparty_name' => 'Texto livre indevido',
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Envie apenas os campos do lancamento rapido.')
            ->assertJsonValidationErrors(['payload']);

        $this->assertDatabaseCount('financial_entries', 0);
    }

    public function test_create_financial_entry_service_uses_explicit_church_scope_without_an_authenticated_request(): void
    {
        $church = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);
        $otherChurch = Church::query()->create([
            'name' => 'Igreja Esperanca',
            'slug' => 'igreja-esperanca',
        ]);

        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');
        $otherCounterparty = $this->createCounterparty($otherChurch->id, 'Visitante', 'visitante');

        $service = new CreateFinancialEntryService;

        $entry = $service->create([
            'church_id' => $church->id,
            'entry_type' => 'income',
            'amount' => '125.40',
            'financial_category_id' => $category->id,
            'counterparty_id' => $counterparty->id,
            'cost_center_name' => 'Cultos de domingo',
        ]);

        $this->assertSame($church->id, $entry->church_id);
        $this->assertSame($counterparty->id, $entry->counterparty_id);
        $this->assertSame('Maria Souza', $entry->counterparty_name);

        try {
            $service->create([
                'church_id' => $church->id,
                'entry_type' => 'income',
                'amount' => '125.40',
                'financial_category_id' => $category->id,
                'counterparty_id' => $otherCounterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

            $this->fail('Expected the service to reject counterparties from another tenant.');
        } catch (ValidationException $exception) {
            $this->assertSame([
                'counterparty_id' => ['Escolha uma contraparte valida da igreja atual.'],
            ], $exception->errors());
        }
    }

    /**
     * @return array{0: User, 1: Church, 2: ChurchUser}
     */
    private function seedMembership(string $role, string $email, string $slug): array
    {
        $church = Church::query()->create([
            'name' => ucfirst(str_replace('-', ' ', $slug)),
            'slug' => $slug,
        ]);

        $user = User::query()->create([
            'name' => 'Maria Silva',
            'email' => $email,
            'password' => 'secret-password', // pragma: allowlist secret
        ]);

        $membership = ChurchUser::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => 'active',
        ]);

        return [$user, $church, $membership];
    }

    private function createCategory(int $churchId, string $name, string $slug, string $kind): FinancialCategory
    {
        return FinancialCategory::query()->withoutGlobalScopes()->create([
            'church_id' => $churchId,
            'name' => $name,
            'slug' => $slug,
            'kind' => $kind,
            'is_default' => false,
        ]);
    }

    private function createCounterparty(int $churchId, string $name, string $slug): FinancialCounterparty
    {
        return FinancialCounterparty::query()->withoutGlobalScopes()->create([
            'church_id' => $churchId,
            'name' => $name,
            'slug' => $slug,
        ]);
    }

    private function createInternalJwt(int $userId, int $churchId, array $roles, string $sessionId): string
    {
        $header = [
            'alg' => 'RS256',
            'typ' => 'JWT',
        ];

        $issuedAt = Carbon::now()->timestamp;
        $payload = [
            'sub' => (string) $userId,
            'user_id' => $userId,
            'church_id' => $churchId,
            'roles' => $roles,
            'session_id' => $sessionId,
            'permissions_version' => 1,
            'iss' => 'church-erp-web',
            'aud' => 'church-erp-api',
            'iat' => $issuedAt,
            'exp' => $issuedAt + 900,
            'jti' => 'test-jti',
        ];

        $encodedHeader = $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR));
        $encodedPayload = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signatureInput = "{$encodedHeader}.{$encodedPayload}";
        openssl_sign($signatureInput, $signature, self::devInternalJwtPrivateKey(), OPENSSL_ALGO_SHA256);

        return "{$signatureInput}.{$this->base64UrlEncode($signature)}";
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
