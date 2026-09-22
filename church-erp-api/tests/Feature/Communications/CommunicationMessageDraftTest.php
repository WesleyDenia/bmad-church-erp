<?php

namespace Tests\Feature\Communications;

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

class CommunicationMessageDraftTest extends TestCase
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

    public function test_secretary_and_administrator_prepare_minimized_message_draft_without_persistence(): void
    {
        foreach (['secretary', 'administrator'] as $role) {
            Log::spy();
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $person = $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'follow_up_needed',
                'display_name' => 'Ana Visitante',
                'phone' => '+351999999999',
                'email' => 'ana@example.com',
                'last_contacted_at' => Carbon::parse('2026-09-01 10:00:00', 'UTC'),
            ]);
            $templateKey = "visitante_primeiro_contato_{$role}";
            $this->createTemplate(null, [
                'template_key' => $templateKey,
                'name' => 'Global substituido',
                'body_template' => 'Global {{nome}}',
            ]);
            $this->createTemplate($church->id, [
                'template_key' => $templateKey,
                'name' => 'Primeiro contato local',
                'body_template' => 'Ola {{nome}}. {{contato}}. Situacao: {{status}}.',
            ]);

            $response = $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->postJson('/api/v1/communications/message-drafts', [
                    'template_key' => $templateKey,
                    'person_type' => 'visitor',
                    'person_id' => $person->id,
                ]);

            $response
                ->assertOk()
                ->assertJsonPath('data.template.template_key', $templateKey)
                ->assertJsonPath('data.template.name', 'Primeiro contato local')
                ->assertJsonPath('data.person.id', $person->id)
                ->assertJsonPath('data.person.display_name', 'Ana Visitante')
                ->assertJsonPath('data.person.status_label', 'Precisa de acompanhamento')
                ->assertJsonPath('data.person.contact_summary', 'Telefone: +351999999999; Email: ana@example.com')
                ->assertJsonPath('data.draft.message_body', 'Ola Ana Visitante. Telefone: +351999999999; Email: ana@example.com. Situacao: Precisa de acompanhamento.')
                ->assertJsonPath('data.draft.used_fields', ['nome', 'contato', 'status'])
                ->assertJsonPath('data.draft.missing_fields', [])
                ->assertJsonPath('data.draft.editable', true)
                ->assertJsonMissingPath('data.template.id')
                ->assertJsonMissingPath('data.template.body_template')
                ->assertJsonMissingPath('data.template.church_id')
                ->assertJsonMissingPath('data.person.phone')
                ->assertJsonMissingPath('data.person.email')
                ->assertJsonMissingPath('data.person.church_id')
                ->assertJsonMissingPath('data.person.last_contacted_at')
                ->assertJsonMissingPath('links')
                ->assertJsonMissingPath('meta');

            $this->assertDatabaseMissing('people', [
                'id' => $person->id,
                'last_contacted_at' => Carbon::now('UTC')->toDateTimeString(),
            ]);
            self::assertFalse(collect(\DB::select("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%draft%'"))->isNotEmpty());

            Log::shouldHaveReceived('info')
                ->with('communication_message_draft_attempted', \Mockery::on(function (array $context) use ($church, $person, $role, $templateKey): bool {
                    $encoded = json_encode($context, JSON_THROW_ON_ERROR);

                    return ($context['church_id'] ?? null) === $church->id
                        && ($context['person_id'] ?? null) === $person->id
                        && ($context['person_type'] ?? null) === 'visitor'
                        && ($context['template_key'] ?? null) === $templateKey
                        && ($context['outcome'] ?? null) === 'success'
                        && isset($context['actor_user_id'], $context['correlation_id'], $context['timestamp'])
                        && ! str_contains($encoded, 'ana@example.com')
                        && ! str_contains($encoded, '+351999999999')
                        && ! str_contains($encoded, 'message_body')
                        && ! str_contains($encoded, 'body_template')
                        && ! str_contains($encoded, 'token')
                        && $role !== '';
                }));
        }
    }

    public function test_missing_contact_needs_update_unknown_placeholder_and_fallback_are_reported(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $person = $this->createPerson($church->id, [
            'person_type' => 'member',
            'status' => 'needs_update',
            'display_name' => 'Maria Membro',
            'phone' => null,
            'email' => null,
        ]);
        $unknownTemplate = $this->createTemplate($church->id, [
            'template_key' => 'atualizacao_cadastro',
            'body_template' => 'Ola {{nome}}. Contato {{contato}}. Campo {{aniversario}}.',
        ]);
        $fallbackTemplate = $this->createTemplate($church->id, [
            'template_key' => 'aviso_sem_campos',
            'body_template' => 'Texto base sem campos.',
        ]);
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-drafts');

        $unknownResponse = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/communications/message-drafts', [
                'template_key' => $unknownTemplate->template_key,
                'person_type' => 'member',
                'person_id' => $person->id,
            ]);

        $unknownResponse
            ->assertOk()
            ->assertJsonPath('data.person.contact_summary', 'Contato pendente')
            ->assertJsonPath('data.draft.message_body', 'Ola Maria Membro. Contato [contato pendente]. Campo {{aniversario}}.')
            ->assertJsonFragment(['field' => 'contact', 'label' => 'Contato', 'message' => 'Telefone ou email ainda nao foi informado.'])
            ->assertJsonFragment(['field' => 'profile_needs_update', 'label' => 'Cadastro para conferir', 'message' => 'Confira os dados da pessoa antes do handoff.'])
            ->assertJsonFragment(['field' => 'unknown_placeholder', 'label' => 'Campo do modelo', 'placeholder' => '{{aniversario}}', 'message' => 'Revise este campo do modelo antes do handoff.']);

        $fallbackResponse = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/communications/message-drafts', [
                'template_key' => $fallbackTemplate->template_key,
                'person_type' => 'member',
                'person_id' => $person->id,
            ]);

        $fallbackResponse
            ->assertOk()
            ->assertJsonPath(
                'data.draft.message_body',
                "Texto base sem campos.\n\nDados para personalizar:\nNome: Maria Membro\nContato: [contato pendente]\nSituacao: Precisa de atualizacao",
            );
    }

    public function test_partial_contact_uses_existing_channel_without_inventing_missing_data(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $person = $this->createPerson($church->id, [
            'person_type' => 'member',
            'phone' => '+351111111111',
            'email' => null,
        ]);
        $this->createTemplate($church->id, [
            'template_key' => 'aviso_semanal',
            'body_template' => 'Contato: {{contato}}',
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-partial'))
            ->postJson('/api/v1/communications/message-drafts', [
                'template_key' => 'aviso_semanal',
                'person_type' => 'member',
                'person_id' => $person->id,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.person.contact_summary', 'Telefone: +351111111111')
            ->assertJsonPath('data.draft.message_body', 'Contato: Telefone: +351111111111')
            ->assertJsonMissing(['Email:']);
    }

    public function test_forbidden_session_and_cross_tenant_cases_are_sanitized(): void
    {
        [$secretary, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        [$treasurer, $treasurerChurch] = $this->seedMembership('treasurer', 'tesoureiro@example.com', 'igreja-tesouraria');
        [$leadership, $leadershipChurch] = $this->seedMembership('leadership', 'lideranca@example.com', 'igreja-lideranca');
        [$inactiveUser, $inactiveChurch, $inactiveMembership] = $this->seedMembership('secretary', 'inativo@example.com', 'igreja-inativa');
        $inactiveMembership->update(['status' => 'inactive']);
        [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');
        $person = $this->createPerson($church->id, ['person_type' => 'visitor', 'status' => 'new']);
        $otherPerson = $this->createPerson($otherChurch->id, ['person_type' => 'visitor', 'display_name' => 'Outra Pessoa']);
        $inactivePerson = $this->createPerson($church->id, [
            'person_type' => 'visitor',
            'status' => 'inactive',
            'display_name' => 'Pessoa Inativa',
            'email' => 'inativa@example.com',
        ]);
        $this->createTemplate($church->id, ['template_key' => 'modelo_local', 'body_template' => 'Ola {{nome}}']);
        $this->createTemplate($otherChurch->id, ['template_key' => 'modelo_outro', 'body_template' => 'Segredo {{nome}}']);
        $this->createTemplate($church->id, ['template_key' => 'modelo_inativo', 'status' => 'inactive', 'body_template' => 'Inativo {{nome}}']);

        $payload = [
            'template_key' => 'modelo_local',
            'person_type' => 'visitor',
            'person_id' => $person->id,
        ];

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($treasurer->id, $treasurerChurch->id, ['treasurer'], 'session-treasurer'))
            ->postJson('/api/v1/communications/message-drafts', $payload)
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.')
            ->assertJsonMissing(['modelo_local', 'Outra Pessoa', 'Pessoa Inativa'])
            ->assertJsonMissingPath('data');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($leadership->id, $leadershipChurch->id, ['leadership'], 'session-leadership'))
            ->postJson('/api/v1/communications/message-drafts', $payload)
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.')
            ->assertJsonMissing(['modelo_local', 'Outra Pessoa', 'Pessoa Inativa'])
            ->assertJsonMissingPath('data');

        $this
            ->withHeader('Authorization', '')
            ->postJson('/api/v1/communications/message-drafts', $payload)
            ->assertUnauthorized()
            ->assertJsonMissingPath('data');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($inactiveUser->id, $inactiveChurch->id, ['secretary'], 'session-inactive'))
            ->postJson('/api/v1/communications/message-drafts', $payload)
            ->assertUnauthorized()
            ->assertJsonMissingPath('data');

        $token = $this->createInternalJwt($secretary->id, $church->id, ['secretary'], 'session-cross');

        foreach ([
            ['template_key' => 'modelo_outro', 'person_type' => 'visitor', 'person_id' => $person->id],
            ['template_key' => 'modelo_inativo', 'person_type' => 'visitor', 'person_id' => $person->id],
            ['template_key' => 'modelo_local', 'person_type' => 'visitor', 'person_id' => $otherPerson->id],
            ['template_key' => 'modelo_local', 'person_type' => 'member', 'person_id' => $person->id],
            ['template_key' => 'modelo_local', 'person_type' => 'visitor', 'person_id' => $inactivePerson->id],
            ['template_key' => 'modelo_local', 'person_type' => 'visitor', 'person_id' => 999999],
        ] as $badPayload) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/communications/message-drafts', $badPayload)
                ->assertStatus(404)
                ->assertJsonPath('message', 'Nao foi possivel preparar esta mensagem.')
                ->assertJsonMissing(['modelo_outro', 'Segredo', 'Outra Pessoa', 'Pessoa Inativa'])
                ->assertJsonMissingPath('data');
        }
    }

    public function test_failed_attempts_are_audited_with_metadata_only(): void
    {
        Log::spy();
        [$secretary, $church] = $this->seedMembership('secretary', 'secretaria-auditoria@example.com', 'igreja-auditoria');
        [$leadership, $leadershipChurch] = $this->seedMembership('leadership', 'lideranca-auditoria@example.com', 'igreja-lideranca-auditoria');
        $person = $this->createPerson($church->id, [
            'person_type' => 'visitor',
            'display_name' => 'Pessoa Auditada',
            'phone' => '+351999999999',
            'email' => 'auditada@example.com',
        ]);
        $this->createTemplate($church->id, [
            'template_key' => 'modelo_auditoria',
            'body_template' => 'Ola {{nome}}',
        ]);

        $payload = [
            'template_key' => 'modelo_auditoria',
            'person_type' => 'visitor',
            'person_id' => $person->id,
        ];

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($leadership->id, $leadershipChurch->id, ['leadership'], 'session-leadership-audit'))
            ->postJson('/api/v1/communications/message-drafts', $payload)
            ->assertForbidden();

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($secretary->id, $church->id, ['secretary'], 'session-not-found-audit'))
            ->postJson('/api/v1/communications/message-drafts', [
                ...$payload,
                'template_key' => 'modelo_inexistente',
            ])
            ->assertNotFound();

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($secretary->id, $church->id, ['secretary'], 'session-validation-audit'))
            ->withHeader('X-Request-ID', "bad\nheaders token SQL trace")
            ->postJson('/api/v1/communications/message-drafts', [
                ...$payload,
                'phone' => '+351999999999',
                'email' => 'auditada@example.com',
            ])
            ->assertUnprocessable();

        foreach (['forbidden', 'not_found', 'validation_failed'] as $outcome) {
            Log::shouldHaveReceived('info')
                ->with('communication_message_draft_attempted', \Mockery::on(function (array $context) use ($outcome): bool {
                    $encoded = json_encode($context, JSON_THROW_ON_ERROR);

                    return ($context['outcome'] ?? null) === $outcome
                        && array_key_exists('actor_user_id', $context)
                        && array_key_exists('church_id', $context)
                        && array_key_exists('person_type', $context)
                        && array_key_exists('person_id', $context)
                        && array_key_exists('template_key', $context)
                        && isset($context['correlation_id'], $context['timestamp'])
                        && is_string($context['correlation_id'])
                        && preg_match('/\A[A-Za-z0-9._:-]{1,64}\z/', $context['correlation_id']) === 1
                        && ! str_contains($encoded, 'auditada@example.com')
                        && ! str_contains($encoded, '+351999999999')
                        && ! str_contains($encoded, 'message_body')
                        && ! str_contains($encoded, 'body_template')
                        && ! str_contains($encoded, 'token')
                        && ! str_contains($encoded, 'headers')
                        && ! str_contains($encoded, 'SQL')
                        && ! str_contains($encoded, 'trace');
                }));
        }
    }

    public function test_query_extra_nested_invalid_json_and_sensitive_payload_fields_are_rejected_before_domain_logic(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $person = $this->createPerson($church->id, ['person_type' => 'visitor']);
        $this->createTemplate($church->id, ['template_key' => 'modelo_local', 'body_template' => 'Ola {{nome}}']);
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-validation');

        foreach (['person_id=1', 'church_id=7', 'qualquer=valor'] as $query) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson("/api/v1/communications/message-drafts?{$query}", [
                    'template_key' => 'modelo_local',
                    'person_type' => 'visitor',
                    'person_id' => $person->id,
                ])
                ->assertUnprocessable()
                ->assertJsonPath('message', 'Revise os dados para preparar a mensagem.')
                ->assertJsonMissingPath('data');
        }

        foreach ([
            ['church_id' => $church->id],
            ['tenant' => 'outro'],
            ['scope' => 'global'],
            ['role' => 'administrator'],
            ['roles' => ['secretary']],
            ['permission' => 'prepare'],
            ['user_id' => $user->id],
            ['id' => 1],
            ['template_id' => 1],
            ['person' => ['id' => $person->id]],
            ['status' => 'active'],
            ['phone' => '+351999999999'],
            ['email' => 'ana@example.com'],
            ['body_template' => '{{nome}}'],
            ['message_body' => 'Ola'],
            ['created_at' => '2026-09-22'],
            ['updated_at' => '2026-09-22'],
            ['person_id' => ['id' => $person->id]],
        ] as $extra) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/communications/message-drafts', [
                    'template_key' => 'modelo_local',
                    'person_type' => 'visitor',
                    'person_id' => $person->id,
                    ...$extra,
                ])
                ->assertUnprocessable()
                ->assertJsonPath('message', 'Revise os dados para preparar a mensagem.')
                ->assertJsonMissingPath('data');
        }

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->call('POST', '/api/v1/communications/message-drafts', [], [], [], [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            ], '{')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Revise os dados para preparar a mensagem.');
    }

    public function test_route_policy_resource_source_and_logs_are_safe(): void
    {
        self::assertTrue(Gate::has('prepareCommunicationMessageDraft'));

        $route = Route::getRoutes()->getByName('communications.message-drafts.store');
        self::assertNotNull($route);
        self::assertContains('resolve.internal.session', $route->gatherMiddleware());
        self::assertContains('throttle:communication-message-drafts', $route->gatherMiddleware());

        $controller = file_get_contents(app_path('Http/Controllers/Api/V1/StoreCommunicationMessageDraftController.php'));
        $resource = file_get_contents(app_path('Http/Resources/CommunicationMessageDraftResource.php'));
        $request = file_get_contents(app_path('Http/Requests/StoreCommunicationMessageDraftRequest.php'));
        $service = file_get_contents(app_path('Domain/Communications/Services/PrepareCommunicationMessageDraftService.php'));
        $renderer = file_get_contents(app_path('Domain/Communications/Support/RenderCommunicationTemplateBody.php'));

        self::assertIsString($controller);
        self::assertIsString($resource);
        self::assertIsString($request);
        self::assertIsString($service);
        self::assertIsString($renderer);
        self::assertStringContainsString('CommunicationMessageDraftResource', $controller);
        self::assertStringContainsString('activeBaseOrTenant($churchId)', $service);
        self::assertStringContainsString("Person::query()\n            ->forChurch(\$churchId)", $service);
        self::assertStringContainsString("where('person_type', \$personType)", $service);
        self::assertStringContainsString("where('status', '!=', 'inactive')", $service);
        self::assertStringContainsString('communication_message_draft_attempted', $service);
        self::assertStringContainsString('communication_message_draft_attempted', $request);
        self::assertStringNotContainsString('ResourceCollection', $controller.$resource);

        foreach (['template_key', 'person_type', 'person_id'] as $allowedInput) {
            self::assertStringContainsString("'{$allowedInput}'", $request);
        }

        foreach (['church_id', 'church_scope_id', 'body_template', 'token', 'headers', 'SQL', 'trace'] as $forbiddenOutput) {
            self::assertStringNotContainsString("'{$forbiddenOutput}'", $resource);
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
     * @param  array<string, mixed>  $overrides
     */
    private function createPerson(int $churchId, array $overrides = []): Person
    {
        $person = new Person;
        $person->forceFill([
            'church_id' => $churchId,
            'person_type' => $overrides['person_type'] ?? 'member',
            'status' => $overrides['status'] ?? 'active',
            'display_name' => $overrides['display_name'] ?? 'Maria Membro',
            'phone' => array_key_exists('phone', $overrides) ? $overrides['phone'] : '+351999999999',
            'email' => array_key_exists('email', $overrides) ? $overrides['email'] : 'maria@example.com',
            'last_contacted_at' => $overrides['last_contacted_at'] ?? null,
            'created_at' => $overrides['created_at'] ?? Carbon::now('UTC'),
            'updated_at' => $overrides['updated_at'] ?? Carbon::now('UTC'),
        ]);

        $person->save();

        return $person;
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
