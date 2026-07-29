<?php

namespace Tests\Feature\Finance;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ListFinancialCategoriesTest extends TestCase
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

    public function test_it_lists_all_categories_for_the_authenticated_tenant(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');

        FinancialCategory::query()->withoutGlobalScopes()->create([
            'church_id' => $church->id,
            'name' => 'Dizimos',
            'slug' => 'dizimos',
            'kind' => 'income',
            'is_default' => true,
        ]);
        FinancialCategory::query()->withoutGlobalScopes()->create([
            'church_id' => $church->id,
            'name' => 'Oferta especial',
            'slug' => 'oferta-especial',
            'kind' => 'income',
            'is_default' => false,
        ]);
        FinancialCategory::query()->withoutGlobalScopes()->create([
            'church_id' => $otherChurch->id,
            'name' => 'Acao social',
            'slug' => 'acao-social',
            'kind' => 'expense',
            'is_default' => true,
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->getJson('/api/v1/finance/categories');

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data.financial_categories')
            ->assertJsonPath('data.financial_categories.0.slug', 'dizimos')
            ->assertJsonPath('data.financial_categories.1.slug', 'oferta-especial');
    }

    public function test_it_requires_an_authenticated_session(): void
    {
        $response = $this->getJson('/api/v1/finance/categories');

        $response
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sessao invalida. Entre novamente.');
    }

    public function test_it_requires_treasury_access_to_list_categories(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lideranca@example.com', 'igreja-central');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->getJson('/api/v1/finance/categories');

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');
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
