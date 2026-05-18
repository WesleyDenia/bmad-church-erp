<?php

namespace Tests\Feature\Finance;

use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Services\CreateFinancialCounterpartyService;
use App\Domain\Finance\Services\ListFinancialCounterpartiesService;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FinancialCounterpartyApiTest extends TestCase
{
    use RefreshDatabase;

    private const DEV_INTERNAL_JWT_PRIVATE_KEY = <<<'PEM'
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCwgtnlDWsscaKm
27ePTiaE+zdEEaf4VY5M1riX2Uby/MAUKTcQbBJbSVj9VY8GhMdjqsPzag6vyQBB
sZfpQzkNU5Ak7wb5ncackchwdnYhWOnLdWQqJfSO5RBzhLIiLxGXZgdhbQWFE1KA
+L4SO0FulRcXIgfatgyfcIycIfFLXIWjC+lk7WhNrE0SdW3StStQvcmXoKoitJmZ
2RJJjpHV5gzPmXhTiHbs2cEveygk3w36dAcRfIbH48dbT7r0pCBa7AjhOlvECylQ
E0aHUt+kk9TdCP54aMXaVhgumaRa2wUXztuHIPKaeyyHq1+I/y7RSoUCfkwWLbWk
0qaRHs6bAgMBAAECggEAEKiWJO0dHMmFZscHbhcblo2uW8ETf7dKDKFv3tDq8RrT
4UiPLFXEGRPKj2+IOz7DzKRnWu07AUcbPEKlCibwgaajIivhliRYWXApdnJlArpa
p6Y8HlLiX6wUXzqk+d9EWJa7V+wLSycVhcY0C2dxQkeq3Aw3qTdo6JFINqITckpa
1Hw1wpq7uYAWsq21uCNjTRvz+/zYQnPbEaTVkqKAywTUmbD6afOgWAhYmsjkbntt
vLfVgSxWE4KD4TwSduEk4kLpLgRvLoJ/lEjMNLPDYhFBz6eKvS6puiShkP4lK/pU
Wb/7wm1PdxAJOGmOoZUyAJslC1S/9y3H5say8eOjQQKBgQDxknp9kx8z6G1hrNW9
VmLbccSthZxwXiX9iVpHyYAI1OmgNuBm0bST1b2DAAf9s/3NxgUjfTXkCB6bLJEj
8dS7EEsmbemcgzXMw4jhNN91h0xrZWcjPQgAmnx+PX/HzKp1fAPQnMajwkquJtUY
k3rXZ0xhs2AoJ9J19qSOIOhdQQKBgQC7DZ7wPRgF0qN+i7SvVwS1oHbzOLc5bmhC
8kAla4uTS4s4K06TfkfD13WeFgCgKE10RDvqakBqwXTccxEFtzcETKwDi1EHUH3q
e2dTW+4mrWzjXpdD3mTdaj7WgMoHSq8BcJUnQAokK6Fbi1wn92hIaWZ5aCOjx2DP
8o7ZAy0I2wKBgHMCGqDoRyWuVUz4PPYcR4pUGp/GCZmRqSKQntOogfUycFufZKxu
0DrFuqjAfg1yALZTvSSNOvfqSa/0wtDLFE1Oz4hnMZ4a9aUbvnIBexV4KZDDwRuM
td+brQNpAgm8TbcLKMHLseJK4MUSpcdCh2w/uKSXAoN7mf4hQ2yLDDVBAoGAag7M
Cn0pbMvE5dCCz1QwmGb2auvCf67JMQQ4OL9ksUyJEH0FnX1hZXp59vuUuTqAyCaU
LlK2WZF9GC2p/iqm6Cos8gmBFPufmV8E8+/Q9V8puTV94P5tBFnkbS0y37WJyvAx
scKOvXl7kPNQely+ZShV8QqKAqfejamDMyqo0zcCgYEAjfQQg1N+VMah60heBBPw
kIB3c2WtzHcq/BbQLT1P9/tmgrY2cxY8H3p7fCKil6ensGcjCeJ/fgY17K5rdhqs
C4NPLL9923dwcNx6BDhAFm17szeaQX9IdukD9waIqTIeceXDLU4MCieNtUzXlwmT
XEJJWgIngdEz5TNE0enNhOA=
-----END PRIVATE KEY-----
PEM;

    protected function setUp(): void
    {
        parent::setUp();

        $privateKey = openssl_pkey_get_private(self::DEV_INTERNAL_JWT_PRIVATE_KEY);

        if ($privateKey === false) {
            $this->fail('Unable to load the internal JWT private key used by the test suite.');
        }

        $details = openssl_pkey_get_details($privateKey);

        if (! is_array($details) || ! isset($details['key']) || ! is_string($details['key'])) {
            $this->fail('Unable to derive the internal JWT public key used by the test suite.');
        }

        config()->set('services.internal_jwt.public_key', $details['key']);
    }

    public function test_it_lists_counterparties_for_the_authenticated_tenant_only(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');

        $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');
        $this->createCounterparty($church->id, 'Fornecedor Local', 'fornecedor-local');
        $this->createCounterparty($otherChurch->id, 'Visitante', 'visitante');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->getJson('/api/v1/finance/counterparties');

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data.financial_counterparties')
            ->assertJsonPath('data.financial_counterparties.0.slug', 'fornecedor-local')
            ->assertJsonPath('data.financial_counterparties.1.slug', 'maria-souza');
    }

    public function test_it_creates_a_minimal_counterparty_for_the_authenticated_tenant(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/counterparties', [
                'name' => '  Maria   Souza  ',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Maria Souza')
            ->assertJsonPath('data.slug', 'maria-souza')
            ->assertJsonPath('data.message', 'Contraparte cadastrada com sucesso.')
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'slug',
                    'message',
                ],
            ]);

        $this->assertDatabaseHas('financial_counterparties', [
            'church_id' => $church->id,
            'name' => 'Maria Souza',
            'slug' => 'maria-souza',
        ]);
    }

    public function test_it_rejects_missing_name_and_duplicate_name_in_the_same_tenant(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $missingNameResponse = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/counterparties', []);

        $missingNameResponse
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Revise os campos obrigatorios e tente novamente.')
            ->assertJsonValidationErrors(['name']);

        $duplicateResponse = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/counterparties', [
                'name' => '  maria   souza ',
            ]);

        $duplicateResponse
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Revise os campos obrigatorios e tente novamente.')
            ->assertJsonValidationErrors(['name']);

        $this->assertDatabaseCount('financial_counterparties', 1);
    }

    public function test_it_allows_the_same_normalized_name_in_another_tenant(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');

        $this->createCounterparty($otherChurch->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->postJson('/api/v1/finance/counterparties', [
                'name' => 'Maria Souza',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Maria Souza');

        $this->assertDatabaseCount('financial_counterparties', 2);
    }

    public function test_it_requires_an_authenticated_session(): void
    {
        $listResponse = $this->getJson('/api/v1/finance/counterparties');
        $createResponse = $this->postJson('/api/v1/finance/counterparties', [
            'name' => 'Maria Souza',
        ]);

        $listResponse
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sessao invalida. Entre novamente.');

        $createResponse
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sessao invalida. Entre novamente.');
    }

    public function test_it_requires_treasury_access_for_listing_and_creation(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lideranca@example.com', 'igreja-central');

        $listResponse = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->getJson('/api/v1/finance/counterparties');

        $createResponse = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->postJson('/api/v1/finance/counterparties', [
                'name' => 'Maria Souza',
            ]);

        $listResponse
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');

        $createResponse
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');
    }

    public function test_it_blocks_duplicate_validation_feedback_for_users_without_treasury_access(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lideranca@example.com', 'igreja-central');
        $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->postJson('/api/v1/finance/counterparties', [
                'name' => '  maria   souza ',
            ]);

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.')
            ->assertJsonMissingPath('errors');
    }

    public function test_counterparty_services_use_explicit_church_scope_without_an_authenticated_request(): void
    {
        $church = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);
        $otherChurch = Church::query()->create([
            'name' => 'Igreja Esperanca',
            'slug' => 'igreja-esperanca',
        ]);

        $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');
        $this->createCounterparty($otherChurch->id, 'Visitante', 'visitante');

        $listService = new ListFinancialCounterpartiesService;

        $listed = $listService->list($church->id);

        $this->assertSame([
            [
                'id' => 1,
                'name' => 'Maria Souza',
                'slug' => 'maria-souza',
            ],
        ], $listed['financial_counterparties']);

        $createService = new CreateFinancialCounterpartyService;
        $created = $createService->create([
            'church_id' => $otherChurch->id,
            'name' => '  Maria   Souza  ',
        ]);

        $this->assertSame($otherChurch->id, $created->church_id);
        $this->assertSame('Maria Souza', $created->name);
        $this->assertSame('maria-souza', $created->slug);

        $this->expectException(ValidationException::class);

        $createService->create([
            'church_id' => $church->id,
            'name' => ' maria souza ',
        ]);
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
            'password' => 'secret-password',
        ]);

        $membership = ChurchUser::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => 'active',
        ]);

        return [$user, $church, $membership];
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
        openssl_sign($signatureInput, $signature, self::DEV_INTERNAL_JWT_PRIVATE_KEY, OPENSSL_ALGO_SHA256);

        return "{$signatureInput}.{$this->base64UrlEncode($signature)}";
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
