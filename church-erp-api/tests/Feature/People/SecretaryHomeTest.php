<?php

namespace Tests\Feature\People;

use App\Domain\Communications\Models\CommunicationTemplate;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Domain\People\Models\Person;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SecretaryHomeTest extends TestCase
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

    public function test_secretary_and_administrator_can_read_home_without_financial_access(): void
    {
        foreach (['secretary', 'administrator'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $this->createTemplate($church->id, ['template_key' => 'visitante_primeiro_contato']);
            $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'new',
                'display_name' => 'Ana Visitante',
                'phone' => '11999990000',
            ]);

            $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->getJson('/api/v1/secretary/home')
                ->assertOk()
                ->assertJsonPath('data.secretary_home.state', 'secretary_home_loaded')
                ->assertJsonPath('data.secretary_home.recent_visitors.state', 'recent_visitors_loaded')
                ->assertJsonPath('data.secretary_home.recent_visitors.limit', 5)
                ->assertJsonPath('data.secretary_home.recent_visitors.window_days', 30)
                ->assertJsonPath('data.secretary_home.recent_visitors.items.0.display_name', 'Ana Visitante')
                ->assertJsonMissingPath('data.secretary_home.recent_visitors.items.0.id')
                ->assertJsonMissingPath('data.secretary_home.recent_visitors.items.0.church_id')
                ->assertJsonPath('data.secretary_home.event_schedule.state', 'event_schedule_unavailable')
                ->assertJsonPath('data.secretary_home.communication_pending.state', 'communication_pending_loaded')
                ->assertJsonPath('data.secretary_home.communication_pending.total_count', 1)
                ->assertJsonPath('data.secretary_home.weekly_checklist.state', 'weekly_checklist_ready')
                ->assertJsonPath('data.secretary_home.weekly_checklist.items.0.state', 'not_started');

            $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}-treasury"))
                ->getJson('/api/v1/finance/entries')
                ->assertForbidden();
        }
    }

    public function test_forbidden_roles_missing_session_and_inactive_membership_do_not_receive_people_data(): void
    {
        foreach (['treasurer', 'leadership'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $this->createPerson($church->id, ['display_name' => 'Pessoa Protegida']);

            $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->getJson('/api/v1/secretary/home')
                ->assertForbidden()
                ->assertJsonPath('message', 'Acesso negado para esta area.')
                ->assertJsonMissing(['Pessoa Protegida'])
                ->assertJsonMissingPath('data.secretary_home');
        }

        $this
            ->withHeader('Authorization', '')
            ->getJson('/api/v1/secretary/home')
            ->assertUnauthorized()
            ->assertJsonMissingPath('data.secretary_home');

        [$inactiveUser, $inactiveChurch, $membership] = $this->seedMembership('secretary', 'inactive@example.com', 'igreja-inativa');
        $membership->update(['status' => 'inactive']);
        $this->createPerson($inactiveChurch->id, ['display_name' => 'Pessoa Inativa']);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($inactiveUser->id, $inactiveChurch->id, ['secretary'], 'session-inactive'))
            ->getJson('/api/v1/secretary/home')
            ->assertUnauthorized()
            ->assertJsonMissing(['Pessoa Inativa'])
            ->assertJsonMissingPath('data.secretary_home');
    }

    public function test_home_uses_current_tenant_and_rejects_scope_parameters(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');

        $this->createPerson($church->id, ['display_name' => 'Maria Central', 'status' => 'needs_update']);
        $this->createPerson($otherChurch->id, ['display_name' => 'Nome Vazado', 'status' => 'new']);

        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/secretary/home')
            ->assertOk()
            ->assertJsonPath('data.secretary_home.people_pending_items.items.0.people_preview.0.display_name', 'Maria Central')
            ->assertJsonMissing(['Nome Vazado']);

        foreach (['church_id=999', 'user_id=1', 'role=administrator', 'tenant=other', 'permission=people', 'scope=all', 'foo=bar'] as $query) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/secretary/home?{$query}")
                ->assertUnprocessable()
                ->assertJsonMissing(['Maria Central'])
                ->assertJsonMissing(['Nome Vazado']);
        }
    }

    public function test_recent_visitors_window_order_limit_and_pending_rules_are_deterministic(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-12T12:00:00Z'));

        try {
            [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');

            foreach (range(1, 6) as $index) {
                $this->createPerson($church->id, [
                    'person_type' => 'visitor',
                    'status' => $index % 2 === 0 ? 'follow_up_needed' : 'new',
                    'display_name' => "Visitante {$index}",
                    'email' => "visitante{$index}@example.com",
                    'created_at' => Carbon::now('UTC')->subDays($index),
                ]);
            }

            $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'display_name' => 'Visitante Antigo',
                'created_at' => Carbon::now('UTC')->subDays(31),
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'inactive',
                'display_name' => 'Visitante Inativo',
                'created_at' => Carbon::now('UTC')->subDay(),
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'member',
                'status' => 'active',
                'display_name' => 'Membro Sem Contato',
                'phone' => null,
                'email' => null,
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'member',
                'status' => 'needs_update',
                'display_name' => 'Membro Atualizacao',
                'phone' => '1133334444',
            ]);

            $response = $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123'))
                ->getJson('/api/v1/secretary/home');

            $response
                ->assertOk()
                ->assertJsonCount(5, 'data.secretary_home.recent_visitors.items')
                ->assertJsonPath('data.secretary_home.recent_visitors.items.0.display_name', 'Visitante 1')
                ->assertJsonPath('data.secretary_home.people_pending_items.state', 'people_pending_items_loaded')
                ->assertJsonPath('data.secretary_home.people_pending_items.total_count', 9)
                ->assertJsonFragment([
                    'label' => 'Cadastrar visitante',
                    'href' => '/secretaria/visitantes/novo',
                    'state' => 'available',
                ])
                ->assertJsonMissingPath('data.secretary_home.people_pending_items.items.0.people_preview.0.email')
                ->assertJsonMissingPath('data.secretary_home.people_pending_items.items.0.people_preview.0.phone');

            $recentNames = array_column(
                $response->json('data.secretary_home.recent_visitors.items'),
                'display_name',
            );
            $this->assertNotContains('Visitante Antigo', $recentNames);
            $this->assertNotContains('Visitante Inativo', $recentNames);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_people_pending_items_use_exact_resolution_contract_without_empty_categories(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');

        $this->createPerson($church->id, [
            'person_type' => 'visitor',
            'status' => 'new',
            'display_name' => 'Visitante Novo',
            'phone' => '11999990000',
        ]);
        $this->createPerson($church->id, [
            'person_type' => 'member',
            'status' => 'active',
            'display_name' => 'Pessoa Sem Contato',
        ]);
        $this->createPerson($church->id, [
            'person_type' => 'member',
            'status' => 'needs_update',
            'display_name' => 'Membro Conferir',
            'email' => 'conferir@example.com',
        ]);
        $this->createPerson($church->id, [
            'person_type' => 'visitor',
            'status' => 'needs_update',
            'display_name' => 'Visitante Status Fora Do Contrato',
            'phone' => '11888880000',
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/secretary/home')
            ->assertOk()
            ->assertJsonPath('data.secretary_home.people_pending_items.state', 'people_pending_items_loaded')
            ->assertJsonPath('data.secretary_home.people_pending_items.total_count', 3);

        $items = collect($response->json('data.secretary_home.people_pending_items.items'));

        $this->assertSame(
            ['missing_contact', 'needs_update', 'visitor_follow_up'],
            $items->pluck('category')->sort()->values()->all(),
        );
        $this->assertSame(
            '/secretaria/pessoas?person_type=visitor&status=new%2Cfollow_up_needed&contact=all',
            $items->firstWhere('category', 'visitor_follow_up')['href'] ?? null,
        );
        $this->assertSame(
            '/secretaria/pessoas?person_type=all&status=all&contact=missing_contact',
            $items->firstWhere('category', 'missing_contact')['href'] ?? null,
        );
        $this->assertSame(
            '/secretaria/pessoas?person_type=member&status=needs_update&contact=all',
            $items->firstWhere('category', 'needs_update')['href'] ?? null,
        );
        $this->assertSame(1, $items->firstWhere('category', 'needs_update')['count'] ?? null);
        $this->assertNotContains(
            'Visitante Status Fora Do Contrato',
            $items->flatMap(fn (array $item): array => array_column($item['people_preview'], 'display_name'))->all(),
        );
    }

    public function test_communication_pending_derives_ready_and_blocked_items_with_minimized_response(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-29T12:00:00Z'));

        try {
            [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
            [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');
            $this->createTemplate(null, ['template_key' => 'visitante_primeiro_contato']);
            $this->createTemplate($church->id, ['template_key' => 'atualizacao_cadastro']);
            $this->createTemplate($otherChurch->id, [
                'template_key' => 'visitante_primeiro_contato',
                'body_template' => 'Segredo de outro tenant',
            ]);

            $visitorFollowUp = $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'follow_up_needed',
                'display_name' => 'Ana Visitante',
                'phone' => '+351999999999',
                'email' => 'ana@example.com',
                'created_at' => Carbon::now('UTC')->subDays(3),
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'new',
                'display_name' => 'Bia Visitante',
                'email' => 'bia@example.com',
                'created_at' => Carbon::now('UTC')->subDays(1),
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'member',
                'status' => 'needs_update',
                'display_name' => 'Maria Membro',
                'phone' => '1133334444',
                'created_at' => Carbon::now('UTC')->subDays(2),
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'new',
                'display_name' => 'Carlos Sem Contato',
                'phone' => null,
                'email' => null,
                'created_at' => Carbon::now('UTC')->subDays(4),
            ]);
            $this->createPerson($otherChurch->id, [
                'person_type' => 'visitor',
                'status' => 'follow_up_needed',
                'display_name' => 'Pessoa Outro Tenant',
                'phone' => '+351111111111',
            ]);

            $response = $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-communication'))
                ->getJson('/api/v1/secretary/home')
                ->assertOk()
                ->assertJsonPath('data.secretary_home.communication_pending.state', 'communication_pending_loaded')
                ->assertJsonPath('data.secretary_home.communication_pending.total_count', 4)
                ->assertJsonMissing(['Pessoa Outro Tenant', '+351999999999', 'ana@example.com', 'Segredo de outro tenant'])
                ->assertJsonMissingPath('data.secretary_home.communication_pending.items.0.people_preview.0.phone')
                ->assertJsonMissingPath('data.secretary_home.communication_pending.items.0.people_preview.0.email')
                ->assertJsonMissingPath('data.secretary_home.communication_pending.items.0.people_preview.0.church_id')
                ->assertJsonMissingPath('data.secretary_home.communication_pending.items.0.people_preview.0.created_at')
                ->assertJsonMissingPath('data.secretary_home.communication_pending.items.0.body_template');

            $items = collect($response->json('data.secretary_home.communication_pending.items'));

            self::assertSame([
                'visitor_follow_up_ready',
                'member_update_ready',
                'missing_contact_for_communication',
            ], $items->pluck('category')->all());

            $visitorItem = $items->firstWhere('category', 'visitor_follow_up_ready');
            self::assertSame('visitante_primeiro_contato', $visitorItem['template_key'] ?? null);
            self::assertSame(
                "/communications?template_key=visitante_primeiro_contato&person_type=visitor&person_id={$visitorFollowUp->id}&source=secretary_home",
                $visitorItem['href'] ?? null,
            );
            self::assertSame(['Ana Visitante', 'Bia Visitante'], array_column($visitorItem['people_preview'], 'display_name'));
            self::assertSame('Contato disponivel', $visitorItem['people_preview'][0]['contact_summary'] ?? null);
            self::assertSame($visitorFollowUp->id, $visitorItem['people_preview'][0]['person_id'] ?? null);

            $missingContact = $items->firstWhere('category', 'missing_contact_for_communication');
            self::assertSame('/secretaria/pessoas?person_type=all&status=all&contact=missing_contact', $missingContact['href'] ?? null);
            self::assertSame('Contato pendente', $missingContact['people_preview'][0]['contact_summary'] ?? null);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_communication_pending_reports_missing_template_without_people_preview_or_person_id(): void
    {
        [$user, $church] = $this->seedMembership('administrator', 'admin@example.com', 'igreja-admin');
        $this->createTemplate($church->id, [
            'template_key' => 'atualizacao_cadastro',
            'status' => 'inactive',
        ]);
        $this->createPerson($church->id, [
            'person_type' => 'member',
            'status' => 'needs_update',
            'display_name' => 'Membro Sem Modelo',
            'phone' => '1133334444',
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['administrator'], 'session-admin'))
            ->getJson('/api/v1/secretary/home')
            ->assertOk()
            ->assertJsonPath('data.secretary_home.communication_pending.state', 'communication_pending_loaded')
            ->assertJsonMissingPath('data.secretary_home.communication_pending.items.0.people_preview.0.person_id');

        self::assertStringNotContainsString(
            'Membro Sem Modelo',
            json_encode($response->json('data.secretary_home.communication_pending'), JSON_THROW_ON_ERROR),
        );

        $items = collect($response->json('data.secretary_home.communication_pending.items'));
        $missingTemplate = $items->firstWhere('category', 'missing_template_for_communication');

        self::assertNotNull($missingTemplate);
        self::assertSame('atualizacao_cadastro', $missingTemplate['template_key'] ?? null);
        self::assertSame('/communications', $missingTemplate['href'] ?? null);
        self::assertSame([], $missingTemplate['people_preview'] ?? null);
        self::assertSame(1, $missingTemplate['count'] ?? null);
    }

    public function test_empty_home_returns_honest_empty_states_and_fixed_non_persisted_checklist(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123'))
            ->getJson('/api/v1/secretary/home')
            ->assertOk()
            ->assertJsonPath('data.secretary_home.state', 'empty_secretary_home')
            ->assertJsonPath('data.secretary_home.people_pending_items.state', 'empty_people_pending_items')
            ->assertJsonPath('data.secretary_home.people_pending_items.total_count', 0)
            ->assertJsonPath('data.secretary_home.communication_pending.state', 'empty_communication_pending')
            ->assertJsonPath('data.secretary_home.communication_pending.total_count', 0)
            ->assertJsonPath('data.secretary_home.recent_visitors.state', 'empty_recent_visitors')
            ->assertJsonCount(4, 'data.secretary_home.weekly_checklist.items')
            ->assertJsonPath('data.secretary_home.weekly_checklist.items.3.key', 'prepare_future_communications')
            ->assertJsonPath('data.secretary_home.weekly_checklist.items.3.state', 'not_started');
    }

    public function test_route_uses_gate_rate_limiter_and_does_not_log_people_payload(): void
    {
        $this->assertTrue(Gate::has('view-secretary-home'));

        $route = Route::getRoutes()->getByName('secretary.home');
        $this->assertNotNull($route);
        $this->assertContains('throttle:secretary-home', $route->gatherMiddleware());

        Log::spy();

        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $this->createPerson($church->id, [
            'display_name' => 'Pessoa Sem Log',
            'email' => 'sem-log@example.com',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123'))
            ->getJson('/api/v1/secretary/home')
            ->assertOk();

        Log::shouldNotHaveReceived('info');
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('error');
    }

    public function test_pending_people_previews_are_limited_without_loading_the_full_pending_set(): void
    {
        $source = file_get_contents(app_path('Domain/People/Services/BuildSecretaryHomeService.php'));

        self::assertIsString($source);
        self::assertStringContainsString('->limit(3)', $source);
        self::assertStringContainsString('private function pendingPeopleQuery', $source);
        self::assertStringNotContainsString("->orderBy('display_name')\n            ->get();", $source);

        $communicationSource = file_get_contents(app_path('Domain/Communications/Services/BuildCommunicationPendingBlockService.php'));

        self::assertIsString($communicationSource);
        self::assertStringContainsString('->limit(self::PREVIEW_LIMIT)', $communicationSource);
        self::assertStringContainsString('activeBaseOrTenant($churchId)', $communicationSource);
        self::assertStringNotContainsString('body_template', $communicationSource);
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
     * @param  array<string, mixed>  $overrides
     */
    private function createPerson(int $churchId, array $overrides = []): Person
    {
        $person = new Person;
        $person->forceFill([
            'church_id' => $churchId,
            'person_type' => $overrides['person_type'] ?? 'member',
            'status' => $overrides['status'] ?? 'active',
            'display_name' => $overrides['display_name'] ?? 'Pessoa Teste',
            'phone' => $overrides['phone'] ?? null,
            'email' => $overrides['email'] ?? null,
            'last_contacted_at' => $overrides['last_contacted_at'] ?? null,
            'created_at' => $overrides['created_at'] ?? Carbon::now('UTC'),
            'updated_at' => $overrides['updated_at'] ?? Carbon::now('UTC'),
        ]);

        $person->save();

        return $person;
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createTemplate(?int $churchId, array $overrides = []): CommunicationTemplate
    {
        $template = new CommunicationTemplate;
        $template->forceFill([
            'church_id' => $churchId,
            'template_key' => $overrides['template_key'] ?? 'modelo_teste',
            'name' => $overrides['name'] ?? 'Modelo Teste',
            'short_description' => $overrides['short_description'] ?? 'Descricao curta sem dados pessoais.',
            'body_template' => $overrides['body_template'] ?? 'Mensagem para {{nome}} com {{contato}} e {{status}}.',
            'category' => $overrides['category'] ?? 'weekly_notice',
            'suggested_channel' => $overrides['suggested_channel'] ?? 'external_handoff',
            'status' => $overrides['status'] ?? 'active',
            'sort_order' => $overrides['sort_order'] ?? 10,
            'created_at' => $overrides['created_at'] ?? Carbon::now('UTC'),
            'updated_at' => $overrides['updated_at'] ?? Carbon::now('UTC'),
        ]);

        $template->save();

        return $template;
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
