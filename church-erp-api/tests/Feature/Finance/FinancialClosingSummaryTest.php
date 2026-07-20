<?php

namespace Tests\Feature\Finance;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class FinancialClosingSummaryTest extends TestCase
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

    public function test_it_builds_a_real_closing_summary_for_the_authenticated_tenant_and_created_at_period(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');

        $this->createEntry($church->id, 'income', '200.00', '2026-06-01 00:00:00');
        $this->createEntry($church->id, 'income', '175.50', '2026-06-03 12:30:00');
        $this->createEntry($church->id, 'expense', '80.25', '2026-06-07 23:59:59');
        $this->createEntry($church->id, 'income', '900.00', '2026-05-31 23:59:59');
        $this->createEntry($otherChurch->id, 'income', '999.00', '2026-06-03 12:30:00');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->getJson('/api/v1/finance/closing-summary?period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z');

        $response
            ->assertOk()
            ->assertJsonPath('data.closing_summary.state', 'closing_summary_loaded')
            ->assertJsonPath('data.closing_summary.period_kind', 'custom_period')
            ->assertJsonPath('data.closing_summary.period_start', '2026-06-01T00:00:00.000000Z')
            ->assertJsonPath('data.closing_summary.period_end', '2026-06-07T23:59:59.000000Z')
            ->assertJsonPath('data.closing_summary.total_income', '375.50')
            ->assertJsonPath('data.closing_summary.total_expense', '80.25')
            ->assertJsonPath('data.closing_summary.net_result', '295.25')
            ->assertJsonPath('data.closing_summary.entry_count', 3)
            ->assertJsonPath('data.closing_summary.calculation_basis', 'financial_entries.created_at');
    }

    public function test_it_resolves_the_default_current_operational_week_in_utc(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-03T10:15:00Z'));

        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $this->createEntry($church->id, 'income', '50.00', '2026-06-01 00:00:00');
        $this->createEntry($church->id, 'expense', '20.00', '2026-06-07 23:59:59');

        try {
            $response = $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
                ->getJson('/api/v1/finance/closing-summary');

            $response
                ->assertOk()
                ->assertJsonPath('data.closing_summary.state', 'closing_summary_loaded')
                ->assertJsonPath('data.closing_summary.period_kind', 'current_operational_week')
                ->assertJsonPath('data.closing_summary.period_start', '2026-06-01T00:00:00.000000Z')
                ->assertJsonPath('data.closing_summary.period_end', '2026-06-07T23:59:59.999999Z')
                ->assertJsonPath('data.closing_summary.total_income', '50.00')
                ->assertJsonPath('data.closing_summary.total_expense', '20.00')
                ->assertJsonPath('data.closing_summary.net_result', '30.00')
                ->assertJsonPath('data.closing_summary.entry_count', 2);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_it_returns_an_empty_summary_shape_without_fabricated_totals(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $this->createEntry($church->id, 'income', '50.00', '2026-06-08 00:00:00');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->getJson('/api/v1/finance/closing-summary?period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z');

        $response
            ->assertOk()
            ->assertJsonPath('data.closing_summary.state', 'empty_closing_summary')
            ->assertJsonPath('data.closing_summary.total_income', '0.00')
            ->assertJsonPath('data.closing_summary.total_expense', '0.00')
            ->assertJsonPath('data.closing_summary.net_result', '0.00')
            ->assertJsonPath('data.closing_summary.entry_count', 0);
    }

    public function test_it_validates_custom_period_as_a_complete_coherent_utc_pair(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $token = $this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/finance/closing-summary?period_start=2026-06-08T00:00:00Z&period_end=2026-06-07T23:59:59Z')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Revise o periodo do fechamento e tente novamente.')
            ->assertJsonValidationErrors(['period_start']);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/finance/closing-summary?period_start=2026-06-01T00:00:00Z')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['period_end']);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/finance/closing-summary?period_start=2026-06-01&period_end=2026-06-07T23:59:59Z')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['period_start']);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/finance/closing-summary?period_start=2026-02-30T00:00:00Z&period_end=2026-03-07T23:59:59Z')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['period_start']);
    }

    public function test_it_blocks_users_without_treasury_access_before_financial_details_leak(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lideranca@example.com', 'igreja-central');
        $this->createEntry($church->id, 'income', '50.00', '2026-06-01 00:00:00');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->getJson('/api/v1/finance/closing-summary?period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z');

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.')
            ->assertJsonMissingPath('data.closing_summary')
            ->assertJsonMissingPath('errors');
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

    private function createEntry(int $churchId, string $entryType, string $amount, string $createdAt): FinancialEntry
    {
        $category = FinancialCategory::query()->withoutGlobalScopes()->firstOrCreate([
            'church_id' => $churchId,
            'slug' => "categoria-{$entryType}",
        ], [
            'name' => "Categoria {$entryType}",
            'kind' => $entryType,
            'is_default' => false,
        ]);
        $counterparty = FinancialCounterparty::query()->withoutGlobalScopes()->firstOrCreate([
            'church_id' => $churchId,
            'slug' => 'maria-souza',
        ], [
            'name' => 'Maria Souza',
        ]);

        $entry = FinancialEntry::query()->withoutGlobalScopes()->create([
            'church_id' => $churchId,
            'entry_type' => $entryType,
            'amount' => $amount,
            'financial_category_id' => $category->id,
            'counterparty_id' => $counterparty->id,
            'counterparty_name' => $counterparty->name,
            'cost_center_name' => 'Cultos de domingo',
        ]);

        $entry->forceFill([
            'created_at' => Carbon::parse($createdAt, 'UTC'),
            'updated_at' => Carbon::parse($createdAt, 'UTC'),
        ])->save();

        return $entry;
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
