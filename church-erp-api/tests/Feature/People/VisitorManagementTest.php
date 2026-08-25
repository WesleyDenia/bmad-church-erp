<?php

namespace Tests\Feature\People;

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

class VisitorManagementTest extends TestCase
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

    public function test_secretary_and_administrator_can_create_view_and_update_visitor_records(): void
    {
        foreach (['secretary', 'administrator'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $token = $this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}");

            Log::spy();

            $createResponse = $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => '  Ana Visitante  ',
                    'status' => 'new',
                    'phone' => '',
                    'email' => 'ANA.VISITANTE@EXAMPLE.COM',
                ]);

            $createResponse
                ->assertCreated()
                ->assertJsonPath('data.visitor.display_name', 'Ana Visitante')
                ->assertJsonPath('data.visitor.status', 'new')
                ->assertJsonPath('data.visitor.phone', null)
                ->assertJsonPath('data.visitor.email', 'ana.visitante@example.com')
                ->assertJsonPath('message', 'Visitante cadastrado com sucesso.')
                ->assertJsonMissingPath('data.visitor.church_id')
                ->assertJsonMissingPath('data.visitor.person_type')
                ->assertJsonMissingPath('data.visitor.created_at')
                ->assertJsonMissingPath('data.visitor.updated_at');

            $visitorId = (int) $createResponse->json('data.visitor.id');

            $this->assertDatabaseHas('people', [
                'id' => $visitorId,
                'church_id' => $church->id,
                'person_type' => 'visitor',
                'status' => 'new',
                'display_name' => 'Ana Visitante',
                'phone' => null,
                'email' => 'ana.visitante@example.com',
            ]);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/visitors/{$visitorId}")
                ->assertOk()
                ->assertJsonPath('data.visitor.id', $visitorId)
                ->assertJsonPath('data.visitor.display_name', 'Ana Visitante')
                ->assertJsonMissingPath('data.visitor.church_id')
                ->assertJsonMissingPath('data.visitor.person_type');

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->patchJson("/api/v1/people/visitors/{$visitorId}", [
                    'display_name' => 'Ana Atualizada',
                    'status' => 'follow_up_needed',
                    'phone' => ' 11999990000 ',
                    'email' => null,
                ])
                ->assertOk()
                ->assertJsonPath('data.visitor.display_name', 'Ana Atualizada')
                ->assertJsonPath('data.visitor.status', 'follow_up_needed')
                ->assertJsonPath('data.visitor.phone', '11999990000')
                ->assertJsonPath('data.visitor.email', null)
                ->assertJsonPath('message', 'Visitante atualizado com sucesso.');

            $this->assertDatabaseHas('people', [
                'id' => $visitorId,
                'church_id' => $church->id,
                'person_type' => 'visitor',
                'display_name' => 'Ana Atualizada',
                'status' => 'follow_up_needed',
                'phone' => '11999990000',
                'email' => null,
            ]);

            Log::shouldHaveReceived('info')
                ->with('people_visitor_changed', \Mockery::on(
                    fn (array $context): bool => $context['event'] === 'people_visitor_changed'
                        && $context['actor_user_id'] === $user->id
                        && $context['church_id'] === $church->id
                        && $context['person_id'] === $visitorId
                        && in_array($context['action'], ['created', 'updated'], true)
                        && array_key_exists('changed_fields', $context)
                        && ! array_key_exists('display_name', $context)
                        && ! array_key_exists('email', $context)
                        && ! array_key_exists('phone', $context)
                        && ! array_key_exists('payload', $context)
                        && ! array_key_exists('token', $context)
                        && ! array_key_exists('cookie', $context)
                        && ! array_key_exists('authorization', $context)
                ))
                ->atLeast()
                ->once();
        }
    }

    public function test_forbidden_roles_missing_session_and_inactive_membership_do_not_receive_pii(): void
    {
        foreach (['treasurer', 'leadership'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $visitor = $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'display_name' => 'Nome Protegido',
                'email' => 'protegido@example.com',
            ]);
            $token = $this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}");

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/visitors/{$visitor->id}")
                ->assertForbidden()
                ->assertJsonPath('message', 'Acesso negado para esta area.')
                ->assertJsonMissing(['Nome Protegido', 'protegido@example.com']);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => 'Outro Nome',
                    'status' => 'new',
                ])
                ->assertForbidden()
                ->assertJsonMissing(['Outro Nome']);
        }

        $this
            ->withHeader('Authorization', '')
            ->getJson('/api/v1/people/visitors/1')
            ->assertUnauthorized()
            ->assertJsonMissing(['Nome Protegido']);

        [$inactiveUser, $inactiveChurch, $membership] = $this->seedMembership('secretary', 'inactive@example.com', 'igreja-inativa');
        $membership->update(['status' => 'inactive']);
        $inactiveVisitor = $this->createPerson($inactiveChurch->id, [
            'person_type' => 'visitor',
            'display_name' => 'Visitante Inativo Protegido',
            'email' => 'inativo@example.com',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($inactiveUser->id, $inactiveChurch->id, ['secretary'], 'session-inactive'))
            ->getJson("/api/v1/people/visitors/{$inactiveVisitor->id}")
            ->assertUnauthorized()
            ->assertJsonMissing(['Visitante Inativo Protegido', 'inativo@example.com']);
    }

    public function test_visitor_routes_enforce_tenant_scope_person_type_and_strict_payload_allowlist(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');
        $ownMember = $this->createPerson($church->id, ['person_type' => 'member', 'display_name' => 'Membro']);
        $otherVisitor = $this->createPerson($otherChurch->id, ['person_type' => 'visitor', 'display_name' => 'Outro Tenant']);

        foreach ([$ownMember->id, $otherVisitor->id, 999999] as $id) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/visitors/{$id}")
                ->assertNotFound()
                ->assertJsonMissing(['Membro', 'Outro Tenant']);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->patchJson("/api/v1/people/visitors/{$id}", [
                    'display_name' => 'Tentativa',
                    'status' => 'new',
                ])
                ->assertNotFound()
                ->assertJsonMissing(['Membro', 'Outro Tenant']);
        }

        foreach (['church_id', 'user_id', 'role', 'roles', 'permission', 'permissions', 'tenant', 'tenant_id', 'scope', 'person_type', 'id', 'created_at', 'updated_at', 'foo'] as $field) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => 'Campo Extra',
                    'status' => 'new',
                    $field => 'unsafe',
                ])
                ->assertUnprocessable()
                ->assertJsonPath('errors.payload.0', 'Envie apenas os campos permitidos do visitante.');
        }

        foreach (['church_id=999', 'tenant_id=2', 'scope=all', 'foo=bar'] as $query) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/visitors/{$ownMember->id}?{$query}")
                ->assertUnprocessable();
        }
    }

    public function test_validation_normalization_duplicate_email_statuses_and_secretary_home_rules(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-12T12:00:00Z'));

        try {
            [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
            [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');
            $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => '',
                    'status' => 'active',
                    'phone' => str_repeat('9', 41),
                    'email' => 'not-an-email',
                ])
                ->assertUnprocessable()
                ->assertJsonPath('errors.display_name.0', 'Informe o nome do visitante.')
                ->assertJsonPath('errors.status.0', 'Escolha uma situacao valida para o visitante.')
                ->assertJsonPath('errors.phone.0', 'Use ate 40 caracteres para o telefone.')
                ->assertJsonPath('errors.email.0', 'Informe um email valido.');

            foreach (['needs_update', '', null, 'unknown'] as $status) {
                $this
                    ->withHeader('Authorization', 'Bearer '.$token)
                    ->postJson('/api/v1/people/visitors', [
                        'display_name' => 'Status Invalido',
                        'status' => $status,
                    ])
                    ->assertUnprocessable()
                    ->assertJsonPath('errors.status.0', 'Escolha uma situacao valida para o visitante.');
            }

            $existingVisitor = $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'new',
                'email' => 'duplicado@example.com',
            ]);
            $this->createPerson($otherChurch->id, [
                'person_type' => 'visitor',
                'email' => 'duplicado@example.com',
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'member',
                'email' => 'membro@example.com',
            ]);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => 'Email Igual',
                    'status' => 'new',
                    'email' => 'DUPLICADO@example.com',
                ])
                ->assertUnprocessable()
                ->assertJsonPath('errors.email.0', 'Este email ja esta em uso por outro visitante.');

            $this->assertDatabaseMissing('people', [
                'display_name' => 'Email Igual',
            ]);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->patchJson("/api/v1/people/visitors/{$existingVisitor->id}", [
                    'email' => 'membro@example.com',
                ])
                ->assertOk()
                ->assertJsonPath('data.visitor.email', 'membro@example.com');

            $followUp = $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => 'Visitante Acompanhar',
                    'status' => 'follow_up_needed',
                ])
                ->assertCreated()
                ->json('data.visitor.display_name');

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => 'Visitante Contatado',
                    'status' => 'contacted',
                ])
                ->assertCreated();

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/visitors', [
                    'display_name' => 'Visitante Inativo',
                    'status' => 'inactive',
                ])
                ->assertCreated();

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->patchJson("/api/v1/people/visitors/{$existingVisitor->id}", [
                    'status' => 'invalid',
                    'display_name' => 'Nao Deve Alterar',
                ])
                ->assertUnprocessable()
                ->assertJsonPath('errors.status.0', 'Escolha uma situacao valida para o visitante.');

            $this->assertDatabaseMissing('people', [
                'id' => $existingVisitor->id,
                'display_name' => 'Nao Deve Alterar',
            ]);

            $home = $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson('/api/v1/secretary/home')
                ->assertOk();

            $this->assertSame('Visitante Acompanhar', $followUp);
            $home->assertJsonFragment(['display_name' => 'Visitante Acompanhar']);
            $home->assertJsonFragment(['display_name' => 'Visitante Contatado']);
            $home->assertJsonMissing(['Visitante Inativo']);

            $pendingItems = $home->json('data.secretary_home.people_pending_items.items');
            $visitorFollowUp = collect($pendingItems)->firstWhere('category', 'visitor_follow_up');

            $this->assertIsArray($visitorFollowUp);
            $this->assertSame(2, $visitorFollowUp['count']);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_patch_partial_and_no_change_update_is_idempotent_without_misleading_audit(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');
        $visitor = $this->createPerson($church->id, [
            'person_type' => 'visitor',
            'status' => 'new',
            'display_name' => 'Visitante Parcial',
            'email' => 'parcial@example.com',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/v1/people/visitors/{$visitor->id}", [
                'phone' => '11988887777',
            ])
            ->assertOk()
            ->assertJsonPath('data.visitor.status', 'new')
            ->assertJsonPath('data.visitor.phone', '11988887777');

        Log::spy();

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/v1/people/visitors/{$visitor->id}", [
                'display_name' => 'Visitante Parcial',
                'status' => 'new',
                'phone' => '11988887777',
                'email' => 'parcial@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('data.visitor.display_name', 'Visitante Parcial');

        Log::shouldNotHaveReceived('info');
    }

    public function test_route_middleware_policy_resource_and_source_paths_are_safe(): void
    {
        $this->assertTrue(Gate::has('createVisitor'));
        $this->assertTrue(Gate::has('viewVisitor'));
        $this->assertTrue(Gate::has('updateVisitor'));

        $storeRoute = Route::getRoutes()->getByName('people.visitors.store');
        $showRoute = Route::getRoutes()->getByName('people.visitors.show');
        $updateRoute = Route::getRoutes()->getByName('people.visitors.update');

        $this->assertNotNull($storeRoute);
        $this->assertNotNull($showRoute);
        $this->assertNotNull($updateRoute);
        $this->assertContains('resolve.internal.session', $storeRoute->gatherMiddleware());
        $this->assertContains('throttle:secretary-visitors-write', $storeRoute->gatherMiddleware());
        $this->assertContains('throttle:secretary-visitors-read', $showRoute->gatherMiddleware());
        $this->assertContains('throttle:secretary-visitors-write', $updateRoute->gatherMiddleware());

        $personModel = file_get_contents(app_path('Domain/People/Models/Person.php'));
        $resource = file_get_contents(app_path('Http/Resources/VisitorResource.php'));
        $storeRequest = file_get_contents(app_path('Http/Requests/StoreVisitorRequest.php'));
        $updateRequest = file_get_contents(app_path('Http/Requests/UpdateVisitorRequest.php'));
        $createService = file_get_contents(app_path('Domain/People/Services/CreateVisitorService.php'));
        $updateService = file_get_contents(app_path('Domain/People/Services/UpdateVisitorService.php'));

        self::assertIsString($personModel);
        self::assertStringNotContainsString("'church_id'", $personModel);
        self::assertStringContainsString("'person_type' => 'visitor'", $createService);
        self::assertStringNotContainsString('$payload[\'person_type\']', $createService.$updateService);
        self::assertStringContainsString("'event' => 'people_visitor_changed'", $createService);
        self::assertStringContainsString("'changed_fields'", $updateService);
        self::assertStringContainsString('Visitante cadastrado com sucesso.', file_get_contents(app_path('Http/Controllers/Api/V1/StoreVisitorController.php')) ?: '');
        self::assertStringContainsString('A regra de conversao de visitante para membro fica fora deste endpoint', $updateService);

        foreach (['church_id', 'person_type', 'created_at', 'updated_at', 'user_id', 'audit'] as $forbiddenOutput) {
            self::assertStringNotContainsString("'{$forbiddenOutput}'", $resource);
        }

        foreach (['church_id', 'user_id', 'role', 'roles', 'tenant', 'permission', 'permissions', 'person_type', 'id', 'created_at', 'updated_at'] as $forbiddenInput) {
            self::assertStringContainsString("'{$forbiddenInput}'", $storeRequest.$updateRequest);
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
    private function createPerson(int $churchId, array $overrides = []): Person
    {
        $person = new Person;
        $person->forceFill([
            'church_id' => $churchId,
            'person_type' => $overrides['person_type'] ?? 'visitor',
            'status' => $overrides['status'] ?? 'new',
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
