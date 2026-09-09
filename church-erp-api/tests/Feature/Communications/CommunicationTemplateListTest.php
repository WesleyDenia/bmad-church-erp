<?php

namespace Tests\Feature\Communications;

use App\Domain\Communications\Models\CommunicationTemplate;
use App\Domain\Communications\Services\ProvisionBaseCommunicationTemplatesService;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CommunicationTemplateListTest extends TestCase
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

    public function test_secretary_and_administrator_can_list_base_templates_without_custom_tenant_data(): void
    {
        $this->app->make(ProvisionBaseCommunicationTemplatesService::class)->provision();

        foreach (['secretary', 'administrator'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");

            $response = $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->getJson('/api/v1/communications/templates');

            $response
                ->assertOk()
                ->assertJsonCount(4, 'data')
                ->assertExactJson([
                    'data' => [
                        [
                            'template_key' => 'visitante_primeiro_contato',
                            'name' => 'Primeiro contato com visitante',
                            'short_description' => 'Mensagem curta para acolher um visitante recente.',
                            'category' => 'visitor_follow_up',
                            'suggested_channel' => 'external_handoff',
                            'status' => 'active',
                            'sort_order' => 10,
                        ],
                        [
                            'template_key' => 'atualizacao_cadastro',
                            'name' => 'Atualizacao de cadastro',
                            'short_description' => 'Pedido simples para confirmar dados cadastrais.',
                            'category' => 'member_update',
                            'suggested_channel' => 'external_handoff',
                            'status' => 'active',
                            'sort_order' => 20,
                        ],
                        [
                            'template_key' => 'aviso_semanal',
                            'name' => 'Aviso semanal',
                            'short_description' => 'Comunicado curto para a rotina da semana.',
                            'category' => 'weekly_notice',
                            'suggested_channel' => 'external_handoff',
                            'status' => 'active',
                            'sort_order' => 30,
                        ],
                        [
                            'template_key' => 'lembrete_evento',
                            'name' => 'Lembrete de evento',
                            'short_description' => 'Lembrete pastoral para uma programacao proxima.',
                            'category' => 'event_reminder',
                            'suggested_channel' => 'external_handoff',
                            'status' => 'active',
                            'sort_order' => 40,
                        ],
                    ],
                ])
                ->assertJsonMissingPath('data.0.id')
                ->assertJsonMissingPath('data.0.church_id')
                ->assertJsonMissingPath('data.0.church_scope_id')
                ->assertJsonMissingPath('data.0.body_template')
                ->assertJsonMissingPath('data.0.created_at')
                ->assertJsonMissingPath('data.0.updated_at')
                ->assertJsonMissingPath('meta')
                ->assertJsonMissingPath('links');
        }
    }

    public function test_tenant_override_replaces_global_template_and_other_tenant_or_inactive_templates_are_hidden(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');

        $this->createTemplate(null, [
            'template_key' => 'visitante_primeiro_contato',
            'name' => 'Global que deve ser substituido',
            'sort_order' => 10,
        ]);
        $this->createTemplate($church->id, [
            'template_key' => 'visitante_primeiro_contato',
            'name' => 'Acolhida da igreja local',
            'short_description' => 'Texto local sem dados pessoais.',
            'sort_order' => 5,
        ]);
        $this->createTemplate($church->id, [
            'template_key' => 'inativo_local',
            'name' => 'Modelo inativo local',
            'status' => 'inactive',
            'sort_order' => 1,
        ]);
        $this->createTemplate($otherChurch->id, [
            'template_key' => 'outro_tenant',
            'name' => 'Modelo de outra igreja',
            'short_description' => 'Nao deve aparecer.',
            'sort_order' => 2,
        ]);
        $this->createTemplate(null, [
            'template_key' => 'aviso_semanal',
            'name' => 'Aviso semanal',
            'sort_order' => 30,
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-templates'))
            ->getJson('/api/v1/communications/templates');

        $response
            ->assertOk()
            ->assertJsonPath('data.0.template_key', 'visitante_primeiro_contato')
            ->assertJsonPath('data.0.name', 'Acolhida da igreja local')
            ->assertJsonPath('data.1.template_key', 'aviso_semanal')
            ->assertJsonMissing(['Global que deve ser substituido', 'Modelo de outra igreja', 'Modelo inativo local', 'Nao deve aparecer.']);

        self::assertSame(
            ['visitante_primeiro_contato', 'aviso_semanal'],
            collect($response->json('data'))->pluck('template_key')->all(),
        );
    }

    public function test_forbidden_missing_session_and_inactive_membership_do_not_receive_template_details(): void
    {
        foreach (['treasurer', 'leadership'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $this->createTemplate($church->id, [
                'template_key' => "custom_{$role}",
                'name' => 'Modelo protegido',
                'short_description' => 'Nao deve aparecer.',
            ]);

            $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->getJson('/api/v1/communications/templates')
                ->assertForbidden()
                ->assertJsonPath('message', 'Acesso negado para esta area.')
                ->assertJsonMissing(['Modelo protegido', 'Nao deve aparecer.', "custom_{$role}"])
                ->assertJsonMissingPath('data');
        }

        $this
            ->withHeader('Authorization', '')
            ->getJson('/api/v1/communications/templates')
            ->assertUnauthorized()
            ->assertJsonMissingPath('data');

        [$inactiveUser, $inactiveChurch, $membership] = $this->seedMembership('secretary', 'inactive@example.com', 'igreja-inativa');
        $membership->update(['status' => 'inactive']);
        $this->createTemplate($inactiveChurch->id, [
            'template_key' => 'custom_inativo',
            'name' => 'Modelo de membership inativa',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($inactiveUser->id, $inactiveChurch->id, ['secretary'], 'session-inactive'))
            ->getJson('/api/v1/communications/templates')
            ->assertUnauthorized()
            ->assertJsonMissing(['Modelo de membership inativa', 'custom_inativo'])
            ->assertJsonMissingPath('data');
    }

    public function test_any_query_string_is_rejected_without_returning_data(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-queries');
        $this->createTemplate($church->id, [
            'template_key' => 'modelo_sensivel',
            'name' => 'Modelo que nao deve sair',
        ]);

        foreach ([
            'church_id=999',
            'tenant=outro',
            'scope=global',
            'role=administrator',
            'roles=secretary',
            'permission=view',
            'user_id=1',
            'id=1',
            'template_id=1',
            'status=active',
            'created_at=2026-09-08',
            'updated_at=2026-09-08',
            'qualquer=valor',
        ] as $query) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/communications/templates?{$query}")
                ->assertUnprocessable()
                ->assertJsonPath('message', 'Revise a leitura dos modelos de comunicacao e tente novamente.')
                ->assertJsonMissing(['Modelo que nao deve sair', 'modelo_sensivel'])
                ->assertJsonMissingPath('data');
        }
    }

    public function test_uniqueness_contract_allows_tenant_override_but_blocks_duplicate_scope_keys(): void
    {
        [, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');

        $this->createTemplate(null, ['template_key' => 'aviso_semanal']);
        $this->createTemplate($church->id, ['template_key' => 'aviso_semanal']);

        $this->expectException(QueryException::class);
        $this->createTemplate($church->id, ['template_key' => 'aviso_semanal']);
    }

    public function test_uniqueness_contract_blocks_duplicate_global_template_keys(): void
    {
        $this->createTemplate(null, ['template_key' => 'aviso_semanal']);

        $this->expectException(QueryException::class);
        $this->createTemplate(null, ['template_key' => 'aviso_semanal']);
    }

    public function test_route_policy_resource_source_and_model_scope_are_safe(): void
    {
        self::assertTrue(Gate::has('viewCommunicationTemplates'));

        $route = Route::getRoutes()->getByName('communications.templates.index');
        self::assertNotNull($route);
        self::assertContains('resolve.internal.session', $route->gatherMiddleware());
        self::assertContains('throttle:communication-templates-read', $route->gatherMiddleware());

        $controller = file_get_contents(app_path('Http/Controllers/Api/V1/ListCommunicationTemplatesController.php'));
        $resource = file_get_contents(app_path('Http/Resources/CommunicationTemplateResource.php'));
        $request = file_get_contents(app_path('Http/Requests/ListCommunicationTemplatesRequest.php'));
        $service = file_get_contents(app_path('Domain/Communications/Services/ListCommunicationTemplatesService.php'));
        $model = file_get_contents(app_path('Domain/Communications/Models/CommunicationTemplate.php'));

        self::assertIsString($controller);
        self::assertIsString($resource);
        self::assertIsString($request);
        self::assertIsString($service);
        self::assertIsString($model);
        self::assertStringContainsString('CommunicationTemplateResource::collection($templates)', $controller);
        self::assertStringContainsString('activeBaseOrTenant($churchId)', $service);
        self::assertStringContainsString('church_id', $model);
        self::assertStringNotContainsString('BelongsToAuthenticatedChurch', $model);
        self::assertStringNotContainsString('ResourceCollection', $controller.$resource);

        foreach (['template_key', 'name', 'short_description', 'category', 'suggested_channel', 'status', 'sort_order'] as $allowedOutput) {
            self::assertStringContainsString("'{$allowedOutput}'", $resource);
        }

        foreach (['id', 'church_id', 'church_scope_id', 'body_template', 'created_at', 'updated_at', 'token', 'headers'] as $forbiddenOutput) {
            self::assertStringNotContainsString("'{$forbiddenOutput}'", $resource);
        }

        foreach (['church_id', 'tenant', 'scope', 'role', 'roles', 'permission', 'user_id', 'id', 'template_id', 'status', 'created_at', 'updated_at'] as $forbiddenInput) {
            self::assertStringContainsString("'{$forbiddenInput}'", $request);
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
            'body_template' => $overrides['body_template'] ?? 'Mensagem base sem dados pessoais concretos.',
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
