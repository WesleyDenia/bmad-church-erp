<?php

namespace Tests\Feature\Finance;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Models\FinancialEntryAudit;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class FinancialEntryEditingTest extends TestCase
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

    public function test_it_updates_a_financial_entry_and_persists_audit_snapshots(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $oldCategory = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $newCategory = $this->createCategory($church->id, 'Oferta especial', 'oferta-especial', 'income');
        $oldCounterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');
        $newCounterparty = $this->createCounterparty($church->id, 'Familia Lima', 'familia-lima');
        $entry = $this->createEntry($church->id, $oldCategory->id, $oldCounterparty->id, 'Maria Souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->withServerVariables(['REMOTE_ADDR' => '10.0.0.25'])
            ->putJson("/api/v1/finance/entries/{$entry->id}", [
                'entry_type' => 'income',
                'amount' => '250.75',
                'financial_category_id' => $newCategory->id,
                'counterparty_id' => $newCounterparty->id,
                'cost_center_name' => 'Missoes',
                'reason' => 'Corrigir subtipo e contraparte apos conferencia.',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $entry->id)
            ->assertJsonPath('data.amount', '250.75')
            ->assertJsonPath('data.financial_category_id', $newCategory->id)
            ->assertJsonPath('data.counterparty_id', $newCounterparty->id)
            ->assertJsonPath('data.counterparty_name', 'Familia Lima')
            ->assertJsonPath('data.cost_center_name', 'Missoes')
            ->assertJsonPath('data.latest_audit.reason', 'Corrigir subtipo e contraparte apos conferencia.')
            ->assertJsonPath('data.latest_audit.user_name', 'Maria Silva')
            ->assertJsonPath('data.message', 'Lancamento atualizado com sucesso.');

        $this->assertDatabaseHas('financial_entries', [
            'id' => $entry->id,
            'church_id' => $church->id,
            'amount' => '250.75',
            'financial_category_id' => $newCategory->id,
            'counterparty_id' => $newCounterparty->id,
            'counterparty_name' => 'Familia Lima',
            'cost_center_name' => 'Missoes',
        ]);

        $this->assertDatabaseHas('financial_entry_audits', [
            'financial_entry_id' => $entry->id,
            'church_id' => $church->id,
            'user_id' => $user->id,
            'reason' => 'Corrigir subtipo e contraparte apos conferencia.',
            'ip_address' => '10.0.0.25',
        ]);

        $audit = FinancialEntryAudit::query()->with('user')->firstOrFail();

        $this->assertSame([
            'entry_type' => 'income',
            'amount' => '125.40',
            'financial_category_id' => $oldCategory->id,
            'financial_category_name' => 'Dizimos',
            'counterparty_id' => $oldCounterparty->id,
            'counterparty_name' => 'Maria Souza',
            'cost_center_name' => 'Cultos de domingo',
        ], $audit->old_values);

        $this->assertSame([
            'entry_type' => 'income',
            'amount' => '250.75',
            'financial_category_id' => $newCategory->id,
            'financial_category_name' => 'Oferta especial',
            'counterparty_id' => $newCounterparty->id,
            'counterparty_name' => 'Familia Lima',
            'cost_center_name' => 'Missoes',
        ], $audit->new_values);
    }

    public function test_it_requires_a_reason_when_updating_a_financial_entry(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');
        $entry = $this->createEntry($church->id, $category->id, $counterparty->id, 'Maria Souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->patchJson("/api/v1/finance/entries/{$entry->id}", [
                'entry_type' => 'income',
                'amount' => '140.10',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
            ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Revise os campos obrigatorios e tente novamente.')
            ->assertJsonValidationErrors(['reason']);

        $this->assertDatabaseCount('financial_entry_audits', 0);
    }

    public function test_it_returns_forbidden_via_policy_before_payload_validation_for_another_tenant(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');
        $otherCategory = $this->createCategory($otherChurch->id, 'Oferta livre', 'oferta-livre', 'income');
        $otherCounterparty = $this->createCounterparty($otherChurch->id, 'Visitante', 'visitante');
        $entry = $this->createEntry($otherChurch->id, $otherCategory->id, $otherCounterparty->id, 'Visitante');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->patchJson("/api/v1/finance/entries/{$entry->id}", [
                'entry_type' => 'income',
                'amount' => 'abc',
                'financial_category_id' => 99999,
                'counterparty_id' => 99999,
                'cost_center_name' => '',
            ]);

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para este lancamento.')
            ->assertJsonMissingPath('errors');
    }

    public function test_it_returns_not_found_when_the_entry_does_not_exist(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->putJson('/api/v1/finance/entries/999999', [
                'entry_type' => 'income',
                'amount' => '140.10',
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'cost_center_name' => 'Cultos de domingo',
                'reason' => 'Tentativa sobre item inexistente.',
            ]);

        $response
            ->assertNotFound()
            ->assertJsonPath('message', 'Lancamento nao encontrado.');
    }

    public function test_it_lists_recent_entries_with_the_latest_audit_snippet(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('treasurer', 'tesoureiro2@example.com', 'igreja-esperanca');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');
        $entry = $this->createEntry($church->id, $category->id, $counterparty->id, 'Maria Souza');
        $otherEntry = $this->createEntry($otherChurch->id, $this->createCategory($otherChurch->id, 'Oferta', 'oferta', 'income')->id, $this->createCounterparty($otherChurch->id, 'Visitante', 'visitante')->id, 'Visitante');

        FinancialEntryAudit::query()->withoutGlobalScopes()->create([
            'financial_entry_id' => $entry->id,
            'church_id' => $church->id,
            'user_id' => $user->id,
            'reason' => 'Ajuste de centro de custo.',
            'old_values' => ['cost_center_name' => 'Cultos de domingo'],
            'new_values' => ['cost_center_name' => 'Missoes'],
            'ip_address' => '127.0.0.1',
        ]);

        FinancialEntryAudit::query()->withoutGlobalScopes()->create([
            'financial_entry_id' => $otherEntry->id,
            'church_id' => $otherChurch->id,
            'user_id' => $user->id,
            'reason' => 'Nao deve aparecer.',
            'old_values' => ['amount' => '10.00'],
            'new_values' => ['amount' => '20.00'],
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->getJson('/api/v1/finance/entries');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data.financial_entries')
            ->assertJsonPath('data.financial_entries.0.id', $entry->id)
            ->assertJsonPath('data.financial_entries.0.latest_audit.reason', 'Ajuste de centro de custo.')
            ->assertJsonPath('data.financial_entries.0.latest_audit.user_name', 'Maria Silva');
    }

    public function test_it_lists_audit_history_for_an_entry(): void
    {
        [$user, $church] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-central');
        $category = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $counterparty = $this->createCounterparty($church->id, 'Maria Souza', 'maria-souza');
        $entry = $this->createEntry($church->id, $category->id, $counterparty->id, 'Maria Souza');

        $firstAudit = FinancialEntryAudit::query()->withoutGlobalScopes()->create([
            'financial_entry_id' => $entry->id,
            'church_id' => $church->id,
            'user_id' => $user->id,
            'reason' => 'Primeiro ajuste.',
            'old_values' => [
                'amount' => '125.40',
                'cost_center_name' => 'Cultos de domingo',
            ],
            'new_values' => [
                'amount' => '130.00',
                'cost_center_name' => 'Cultos de domingo',
            ],
            'ip_address' => '127.0.0.1',
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);

        $secondAudit = FinancialEntryAudit::query()->withoutGlobalScopes()->create([
            'financial_entry_id' => $entry->id,
            'church_id' => $church->id,
            'user_id' => $user->id,
            'reason' => 'Segundo ajuste.',
            'old_values' => [
                'amount' => '130.00',
                'cost_center_name' => 'Cultos de domingo',
            ],
            'new_values' => [
                'amount' => '140.00',
                'cost_center_name' => 'Missoes',
            ],
            'ip_address' => '127.0.0.2',
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['treasurer'], 'session-123'))
            ->getJson("/api/v1/finance/entries/{$entry->id}/audits");

        $response
            ->assertOk()
            ->assertJsonCount(2, 'data.audits')
            ->assertJsonPath('data.audits.0.id', $secondAudit->id)
            ->assertJsonPath('data.audits.0.reason', 'Segundo ajuste.')
            ->assertJsonPath('data.audits.0.user_name', 'Maria Silva')
            ->assertJsonPath('data.audits.0.changed_fields.0.field', 'amount')
            ->assertJsonPath('data.audits.0.changed_fields.1.field', 'cost_center_name')
            ->assertJsonPath('data.audits.1.id', $firstAudit->id);
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

    private function createCategory(int $churchId, string $name, string $slug, string $kind): FinancialCategory
    {
        /** @var FinancialCategory $category */
        $category = FinancialCategory::query()->withoutGlobalScopes()->create([
            'church_id' => $churchId,
            'name' => $name,
            'slug' => $slug,
            'kind' => $kind,
            'is_default' => false,
        ]);

        return $category;
    }

    private function createCounterparty(int $churchId, string $name, string $slug): FinancialCounterparty
    {
        /** @var FinancialCounterparty $counterparty */
        $counterparty = FinancialCounterparty::query()->withoutGlobalScopes()->create([
            'church_id' => $churchId,
            'name' => $name,
            'slug' => $slug,
        ]);

        return $counterparty;
    }

    private function createEntry(
        int $churchId,
        int $categoryId,
        int $counterpartyId,
        string $counterpartyName,
    ): FinancialEntry {
        /** @var FinancialEntry $entry */
        $entry = FinancialEntry::query()->withoutGlobalScopes()->create([
            'church_id' => $churchId,
            'entry_type' => 'income',
            'amount' => '125.40',
            'financial_category_id' => $categoryId,
            'counterparty_id' => $counterpartyId,
            'counterparty_name' => $counterpartyName,
            'cost_center_name' => 'Cultos de domingo',
        ]);

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
