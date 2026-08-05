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
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class LeadershipClosingSummaryTest extends TestCase
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

    public function test_leadership_and_administrator_can_read_the_default_summary_without_treasury_access(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-03T10:15:00Z'));

        try {
            foreach (['leadership', 'administrator'] as $role) {
                [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
                $this->createEntry($church->id, 'income', '50.00', '2026-06-01 10:00:00');
                $this->createEntry($church->id, 'expense', '15.00', '2026-06-02 10:00:00');

                $token = $this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}");

                $this
                    ->withHeader('Authorization', 'Bearer '.$token)
                    ->getJson('/api/v1/leadership/closing-summary')
                    ->assertOk()
                    ->assertJsonPath('data.closing_summary.state', 'closing_summary_loaded')
                    ->assertJsonPath('data.closing_summary.period_kind', 'current_operational_week')
                    ->assertJsonPath('data.closing_summary.total_income', '50.00')
                    ->assertJsonPath('data.closing_summary.total_expense', '15.00')
                    ->assertJsonPath('data.closing_summary.net_result', '35.00')
                    ->assertJsonPath('data.closing_summary.entry_count', 2)
                    ->assertJsonPath('data.closing_summary.calculation_basis', 'financial_entries.created_at')
                    ->assertJsonMissingPath('data.closing_summary.details');

                $this
                    ->withHeader('Authorization', 'Bearer '.$token)
                    ->getJson('/api/v1/backoffice/access/treasury')
                    ->assertForbidden();

                $this
                    ->withHeader('Authorization', 'Bearer '.$token)
                    ->getJson('/api/v1/finance/entries')
                    ->assertForbidden();
            }
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_treasurer_secretary_and_missing_session_cannot_read_leadership_summary(): void
    {
        foreach (['treasurer', 'secretary'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $this->createEntry($church->id, 'income', '50.00', '2026-06-01 10:00:00');

            $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->getJson('/api/v1/leadership/closing-summary')
                ->assertForbidden()
                ->assertJsonPath('message', 'Acesso negado para esta area.')
                ->assertJsonMissingPath('data.closing_summary');
        }

        $this
            ->withHeader('Authorization', '')
            ->getJson('/api/v1/leadership/closing-summary')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sessao invalida. Entre novamente.');
    }

    public function test_leadership_summary_keeps_tenant_scope_and_uses_reconciled_details_only_when_requested(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lider@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('leadership', 'outro@example.com', 'igreja-outra');
        $donations = $this->createCategory($church->id, 'Dizimos', 'dizimos', 'income');
        $otherDonations = $this->createCategory($otherChurch->id, 'Dizimos vazados', 'dizimos-vazados', 'income');

        $this->createEntry($church->id, 'income', '200.00', '2026-06-01 10:00:00', [
            'category' => $donations,
            'cost_center_name' => 'Cultos de domingo',
        ]);
        $this->createEntry($church->id, 'expense', '80.00', '2026-06-02 10:00:00', [
            'cost_center_name' => 'Cultos de domingo',
        ]);
        $this->createEntry($otherChurch->id, 'income', '999.00', '2026-06-02 10:00:00', [
            'category' => $otherDonations,
            'cost_center_name' => 'Outro tenant',
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->getJson('/api/v1/leadership/closing-summary?include_details=true&period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z');

        $response
            ->assertOk()
            ->assertJsonPath('data.closing_summary.state', 'closing_summary_loaded')
            ->assertJsonPath('data.closing_summary.period_kind', 'custom_period')
            ->assertJsonPath('data.closing_summary.total_income', '200.00')
            ->assertJsonPath('data.closing_summary.total_expense', '80.00')
            ->assertJsonPath('data.closing_summary.net_result', '120.00')
            ->assertJsonPath('data.closing_summary.entry_count', 2)
            ->assertJsonPath('data.closing_summary.details.reconciliation.cost_center_status', 'consistent')
            ->assertJsonPath('data.closing_summary.details.reconciliation.subtype_status', 'consistent')
            ->assertJsonPath('data.closing_summary.details.by_cost_center.0.cost_center_name', 'Cultos de domingo')
            ->assertJsonPath('data.closing_summary.details.by_subtype.0.financial_category_name', 'Dizimos')
            ->assertJsonMissing(['cost_center_name' => 'Outro tenant'])
            ->assertJsonMissing(['financial_category_name' => 'Dizimos vazados'])
            ->assertJsonMissingPath('data.closing_summary.details.by_cost_center.0.counterparty_name')
            ->assertJsonMissingPath('data.closing_summary.details.by_cost_center.0.user_id')
            ->assertJsonMissingPath('data.closing_summary.details.by_cost_center.0.audit');
    }

    public function test_leadership_conference_period_rejects_invalid_windows_and_scope_parameters(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-05T12:00:00Z'));

        try {
            [$user, $church] = $this->seedMembership('leadership', 'lider@example.com', 'igreja-central');
            $token = $this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123');

            $invalidQueries = [
                'period_start=2026-06-01T00:00:00Z',
                'period_start=2026-06-01&period_end=2026-06-07T23:59:59Z',
                'period_start=2026-06-01T00:00:00Z&period_end=2026-07-03T00:00:00Z',
                'period_start=2025-07-01T00:00:00Z&period_end=2025-07-07T23:59:59Z',
                'period_start=2026-08-06T00:00:00Z&period_end=2026-08-06T23:59:59Z',
                'church_id=999',
                'user_id=1',
                'tenant=other',
                'role=administrator',
                'permission=treasury',
                'permissao=treasury',
                'scope=treasury',
                'foo=bar',
                'include_details=yes',
            ];

            foreach ($invalidQueries as $query) {
                $this
                    ->withHeader('Authorization', 'Bearer '.$token)
                    ->getJson("/api/v1/leadership/closing-summary?{$query}")
                    ->assertUnprocessable();
            }
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_conference_mode_uses_an_explicit_gate_and_logs_access_without_financial_payload(): void
    {
        $this->assertTrue(Gate::has('view-leadership-period-summary'));

        Log::spy();

        [$user, $church] = $this->seedMembership('leadership', 'lider@example.com', 'igreja-central');
        $this->createEntry($church->id, 'income', '75.00', '2026-06-01 10:00:00');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->getJson('/api/v1/leadership/closing-summary?period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z')
            ->assertOk();

        Log::shouldHaveReceived('info')
            ->with('leadership_closing_summary_conference_access', \Mockery::on(function (array $context) use ($user, $church): bool {
                return $context['user_id'] === $user->id
                    && $context['church_id'] === $church->id
                    && $context['period_start'] === '2026-06-01T00:00:00.000000Z'
                    && $context['period_end'] === '2026-06-07T23:59:59.000000Z'
                    && $context['result'] === 'allowed'
                    && ! array_key_exists('payload', $context)
                    && ! array_key_exists('token', $context)
                    && ! array_key_exists('headers', $context)
                    && ! array_key_exists('trace', $context);
            }))
            ->once();

        [$treasurer, $treasurerChurch] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-tesoureiro');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($treasurer->id, $treasurerChurch->id, ['treasurer'], 'session-treasurer'))
            ->getJson('/api/v1/leadership/closing-summary?period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z')
            ->assertForbidden();

        Log::shouldHaveReceived('warning')
            ->with('leadership_closing_summary_conference_access', \Mockery::on(function (array $context) use ($treasurer, $treasurerChurch): bool {
                return $context['user_id'] === $treasurer->id
                    && $context['church_id'] === $treasurerChurch->id
                    && $context['period_start'] === '2026-06-01T00:00:00.000000Z'
                    && $context['period_end'] === '2026-06-07T23:59:59.000000Z'
                    && $context['period_start_present'] === true
                    && $context['period_end_present'] === true
                    && $context['period_valid'] === true
                    && $context['result'] === 'denied'
                    && $context['reason'] === 'area_denied'
                    && ! array_key_exists('payload', $context)
                    && ! array_key_exists('token', $context)
                    && ! array_key_exists('headers', $context)
                    && ! array_key_exists('trace', $context);
            }))
            ->once();

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($treasurer->id, $treasurerChurch->id, ['treasurer'], 'session-treasurer-invalid-period'))
            ->getJson('/api/v1/leadership/closing-summary?period_start=not-a-date&period_end=2026-06-07T23:59:59Z')
            ->assertForbidden();

        Log::shouldHaveReceived('warning')
            ->with('leadership_closing_summary_conference_access', \Mockery::on(function (array $context) use ($treasurer, $treasurerChurch): bool {
                return $context['user_id'] === $treasurer->id
                    && $context['church_id'] === $treasurerChurch->id
                    && $context['period_start'] === null
                    && $context['period_end'] === '2026-06-07T23:59:59.000000Z'
                    && $context['period_start_present'] === true
                    && $context['period_end_present'] === true
                    && $context['period_valid'] === false
                    && $context['result'] === 'denied'
                    && $context['reason'] === 'area_denied'
                    && ! array_key_exists('payload', $context)
                    && ! array_key_exists('token', $context)
                    && ! array_key_exists('headers', $context)
                    && ! array_key_exists('trace', $context);
            }))
            ->once();
    }

    public function test_consistency_error_is_preserved_with_sanitized_aggregate_payload(): void
    {
        [$user, $church] = $this->seedMembership('leadership', 'lider@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('leadership', 'outro@example.com', 'igreja-outra');
        $foreignCategory = $this->createCategory($otherChurch->id, 'Categoria estrangeira', 'categoria-estrangeira', 'income');

        $this->createEntry($church->id, 'income', '50.00', '2026-06-01 10:00:00', [
            'category' => $foreignCategory,
            'cost_center_name' => 'Cultos sigilosos',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123'))
            ->getJson('/api/v1/leadership/closing-summary?include_details=true&period_start=2026-06-01T00:00:00Z&period_end=2026-06-07T23:59:59Z')
            ->assertStatus(409)
            ->assertJsonPath('message', 'Nao foi possivel confirmar a consistencia do fechamento.')
            ->assertJsonPath('data.closing_summary.state', 'consistency_error')
            ->assertJsonPath('data.closing_summary.details.by_cost_center', [])
            ->assertJsonPath('data.closing_summary.details.by_subtype', [])
            ->assertJsonPath('data.closing_summary.details.reconciliation.subtype_status', 'inconsistent')
            ->assertJsonMissing(['financial_category_name' => 'Categoria estrangeira'])
            ->assertJsonMissing(['cost_center_name' => 'Cultos sigilosos']);
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

    /**
     * @param  array{category?: FinancialCategory, cost_center_name?: string}  $overrides
     */
    private function createEntry(int $churchId, string $entryType, string $amount, string $createdAt, array $overrides = []): FinancialEntry
    {
        $category = $overrides['category'] ?? $this->createCategory(
            $churchId,
            "Categoria {$entryType}",
            "categoria-{$entryType}",
            $entryType,
        );
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
            'cost_center_name' => $overrides['cost_center_name'] ?? 'Cultos de domingo',
        ]);

        $entry->forceFill([
            'created_at' => Carbon::parse($createdAt, 'UTC'),
            'updated_at' => Carbon::parse($createdAt, 'UTC'),
        ])->save();

        return $entry;
    }

    private function createCategory(int $churchId, string $name, string $slug, string $kind): FinancialCategory
    {
        return FinancialCategory::query()->withoutGlobalScopes()->firstOrCreate([
            'church_id' => $churchId,
            'slug' => $slug,
        ], [
            'name' => $name,
            'kind' => $kind,
            'is_default' => false,
        ]);
    }

    /**
     * @param  array<int, string>  $roles
     */
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
