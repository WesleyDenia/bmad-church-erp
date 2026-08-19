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

class MemberManagementTest extends TestCase
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

    public function test_secretary_and_administrator_can_create_view_and_update_member_records(): void
    {
        foreach (['secretary', 'administrator'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $token = $this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}");

            Log::spy();

            $createResponse = $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/members', [
                    'display_name' => '  Ana Membro  ',
                    'status' => 'active',
                    'phone' => '',
                    'email' => 'ANA.MEMBRO@EXAMPLE.COM',
                ]);

            $createResponse
                ->assertCreated()
                ->assertJsonPath('data.member.display_name', 'Ana Membro')
                ->assertJsonPath('data.member.status', 'active')
                ->assertJsonPath('data.member.phone', null)
                ->assertJsonPath('data.member.email', 'ana.membro@example.com')
                ->assertJsonPath('message', 'Membro cadastrado com sucesso.')
                ->assertJsonMissingPath('data.member.church_id')
                ->assertJsonMissingPath('data.member.person_type')
                ->assertJsonMissingPath('data.member.created_at')
                ->assertJsonMissingPath('data.member.updated_at');

            $memberId = (int) $createResponse->json('data.member.id');

            $this->assertDatabaseHas('people', [
                'id' => $memberId,
                'church_id' => $church->id,
                'person_type' => 'member',
                'status' => 'active',
                'display_name' => 'Ana Membro',
                'phone' => null,
                'email' => 'ana.membro@example.com',
            ]);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/members/{$memberId}")
                ->assertOk()
                ->assertJsonPath('data.member.id', $memberId)
                ->assertJsonPath('data.member.display_name', 'Ana Membro')
                ->assertJsonMissingPath('data.member.church_id')
                ->assertJsonMissingPath('data.member.person_type');

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->patchJson("/api/v1/people/members/{$memberId}", [
                    'display_name' => 'Ana Atualizada',
                    'status' => 'needs_update',
                    'phone' => ' 11999990000 ',
                    'email' => null,
                ])
                ->assertOk()
                ->assertJsonPath('data.member.display_name', 'Ana Atualizada')
                ->assertJsonPath('data.member.status', 'needs_update')
                ->assertJsonPath('data.member.phone', '11999990000')
                ->assertJsonPath('data.member.email', null)
                ->assertJsonPath('message', 'Membro atualizado com sucesso.');

            $this->assertDatabaseHas('people', [
                'id' => $memberId,
                'church_id' => $church->id,
                'person_type' => 'member',
                'display_name' => 'Ana Atualizada',
                'status' => 'needs_update',
                'phone' => '11999990000',
                'email' => null,
            ]);

            Log::shouldHaveReceived('info')
                ->with('people_member_changed', \Mockery::on(
                    fn (array $context): bool => $context['event'] === 'people_member_changed'
                        && $context['actor_user_id'] === $user->id
                        && $context['church_id'] === $church->id
                        && $context['person_id'] === $memberId
                        && in_array($context['action'], ['created', 'updated'], true)
                        && ! array_key_exists('display_name', $context)
                        && ! array_key_exists('email', $context)
                        && ! array_key_exists('phone', $context)
                        && ! array_key_exists('payload', $context)
                        && ! array_key_exists('token', $context)
                ))
                ->atLeast()
                ->once();
        }
    }

    public function test_forbidden_roles_missing_session_and_inactive_membership_do_not_receive_pii(): void
    {
        foreach (['treasurer', 'leadership'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $member = $this->createPerson($church->id, [
                'display_name' => 'Nome Protegido',
                'email' => 'protegido@example.com',
            ]);
            $token = $this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}");

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/members/{$member->id}")
                ->assertForbidden()
                ->assertJsonPath('message', 'Acesso negado para esta area.')
                ->assertJsonMissing(['Nome Protegido', 'protegido@example.com']);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/members', [
                    'display_name' => 'Outro Nome',
                    'status' => 'active',
                ])
                ->assertForbidden()
                ->assertJsonMissing(['Outro Nome']);
        }

        $this
            ->withHeader('Authorization', '')
            ->getJson('/api/v1/people/members/1')
            ->assertUnauthorized()
            ->assertJsonMissing(['Nome Protegido']);

        [$inactiveUser, $inactiveChurch, $membership] = $this->seedMembership('secretary', 'inactive@example.com', 'igreja-inativa');
        $membership->update(['status' => 'inactive']);
        $inactiveMember = $this->createPerson($inactiveChurch->id, [
            'display_name' => 'Membro Inativo Protegido',
            'email' => 'inativo@example.com',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($inactiveUser->id, $inactiveChurch->id, ['secretary'], 'session-inactive'))
            ->getJson("/api/v1/people/members/{$inactiveMember->id}")
            ->assertUnauthorized()
            ->assertJsonMissing(['Membro Inativo Protegido', 'inativo@example.com']);
    }

    public function test_member_routes_enforce_tenant_scope_person_type_and_strict_payload_allowlist(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');
        $ownVisitor = $this->createPerson($church->id, ['person_type' => 'visitor', 'display_name' => 'Visitante']);
        $otherMember = $this->createPerson($otherChurch->id, ['display_name' => 'Outro Tenant']);

        foreach ([$ownVisitor->id, $otherMember->id, 999999] as $id) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/members/{$id}")
                ->assertNotFound()
                ->assertJsonMissing(['Visitante', 'Outro Tenant']);

            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->patchJson("/api/v1/people/members/{$id}", [
                    'display_name' => 'Tentativa',
                    'status' => 'active',
                ])
                ->assertNotFound()
                ->assertJsonMissing(['Visitante', 'Outro Tenant']);
        }

        foreach (['church_id', 'user_id', 'role', 'roles', 'permission', 'permissions', 'tenant', 'tenant_id', 'scope', 'person_type', 'id', 'created_at', 'updated_at', 'foo'] as $field) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/v1/people/members', [
                    'display_name' => 'Campo Extra',
                    'status' => 'active',
                    $field => 'unsafe',
                ])
                ->assertUnprocessable()
                ->assertJsonPath('errors.payload.0', 'Envie apenas os campos permitidos do membro.');
        }

        foreach (['church_id=999', 'tenant_id=2', 'scope=all', 'foo=bar'] as $query) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people/members/{$ownVisitor->id}?{$query}")
                ->assertUnprocessable();
        }
    }

    public function test_validation_normalization_duplicate_email_and_pending_home_rules(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('secretary', 'outra@example.com', 'igreja-outra');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/people/members', [
                'display_name' => '',
                'status' => 'new',
                'phone' => str_repeat('9', 41),
                'email' => 'not-an-email',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.display_name.0', 'Informe o nome do membro.')
            ->assertJsonPath('errors.status.0', 'Escolha uma situacao valida para o membro.')
            ->assertJsonPath('errors.phone.0', 'Use ate 40 caracteres para o telefone.')
            ->assertJsonPath('errors.email.0', 'Informe um email valido.');

        $existing = $this->createPerson($church->id, ['email' => 'duplicado@example.com']);
        $this->createPerson($otherChurch->id, ['email' => 'duplicado@example.com']);
        $this->createPerson($church->id, ['person_type' => 'visitor', 'email' => 'visitante@example.com']);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/people/members', [
                'display_name' => 'Email Igual',
                'status' => 'active',
                'email' => 'DUPLICADO@example.com',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Este email ja esta em uso por outro membro.');

        $this->assertDatabaseMissing('people', [
            'display_name' => 'Email Igual',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/v1/people/members/{$existing->id}", [
                'display_name' => 'Visitante Pode Repetir',
                'status' => 'active',
                'email' => 'visitante@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('data.member.email', 'visitante@example.com');

        $activeMissingContact = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/people/members', [
                'display_name' => 'Membro Sem Contato',
                'status' => 'active',
            ])
            ->assertCreated()
            ->json('data.member.display_name');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/people/members', [
                'display_name' => 'Membro Inativo Sem Contato',
                'status' => 'inactive',
            ])
            ->assertCreated();

        $home = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/secretary/home')
            ->assertOk();

        $this->assertSame('Membro Sem Contato', $activeMissingContact);
        $home->assertJsonFragment(['display_name' => 'Membro Sem Contato']);
        $home->assertJsonMissing(['Membro Inativo Sem Contato']);
    }

    public function test_route_middleware_policy_resource_indexes_and_source_logs_are_safe(): void
    {
        $this->assertTrue(Gate::has('createMember'));
        $this->assertTrue(Gate::has('viewMember'));
        $this->assertTrue(Gate::has('updateMember'));

        $storeRoute = Route::getRoutes()->getByName('people.members.store');
        $showRoute = Route::getRoutes()->getByName('people.members.show');
        $updateRoute = Route::getRoutes()->getByName('people.members.update');

        $this->assertNotNull($storeRoute);
        $this->assertNotNull($showRoute);
        $this->assertNotNull($updateRoute);
        $this->assertContains('resolve.internal.session', $storeRoute->gatherMiddleware());
        $this->assertContains('throttle:secretary-members-write', $storeRoute->gatherMiddleware());
        $this->assertContains('throttle:secretary-members-read', $showRoute->gatherMiddleware());
        $this->assertContains('throttle:secretary-members-write', $updateRoute->gatherMiddleware());

        $personModel = file_get_contents(app_path('Domain/People/Models/Person.php'));
        $resource = file_get_contents(app_path('Http/Resources/MemberResource.php'));
        $migration = implode("\n", array_map(
            static fn (string $path): string => file_get_contents($path) ?: '',
            glob(database_path('migrations/*add_member_indexes_to_people_table.php')) ?: [],
        ));
        $createService = file_get_contents(app_path('Domain/People/Services/CreateMemberService.php'));
        $updateService = file_get_contents(app_path('Domain/People/Services/UpdateMemberService.php'));

        self::assertIsString($personModel);
        self::assertStringNotContainsString("'church_id'", $personModel);
        self::assertStringContainsString('people_church_type_display_name_index', $migration);
        self::assertStringContainsString('people_church_type_email_unique', $migration);
        self::assertStringContainsString("'event' => 'people_member_changed'", $createService);
        self::assertStringContainsString("'changed_fields'", $updateService);

        foreach (['church_id', 'person_type', 'created_at', 'updated_at', 'user_id', 'audit'] as $forbiddenOutput) {
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
