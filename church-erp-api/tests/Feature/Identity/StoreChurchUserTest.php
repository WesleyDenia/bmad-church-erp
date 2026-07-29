<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StoreChurchUserTest extends TestCase
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

    public function test_administrator_can_create_a_new_church_user_with_an_mvp_role(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@example.com', 'igreja-central');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-123'))
            ->postJson('/api/v1/church-users', $this->validPayload([
                'email' => 'tesoureiro@example.com',
                'role' => 'treasurer',
            ]));

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.name', 'Carlos Pereira')
            ->assertJsonPath('data.user.email', 'tesoureiro@example.com')
            ->assertJsonPath('data.membership.church_id', $church->id)
            ->assertJsonPath('data.membership.role', 'treasurer')
            ->assertJsonPath('data.membership.status', 'active')
            ->assertJsonPath('data.action', 'created')
            ->assertJsonPath('data.message', 'Usuario cadastrado com sucesso.');

        $createdUser = User::query()->where('email', 'tesoureiro@example.com')->first();

        self::assertNotNull($createdUser);
        self::assertTrue(Hash::check('secret-password', $createdUser->password)); // pragma: allowlist secret
        $this->assertDatabaseHas('church_user', [
            'church_id' => $church->id,
            'user_id' => $createdUser->id,
            'role' => 'treasurer',
            'status' => 'active',
        ]);
    }

    public function test_it_blocks_duplicate_membership_in_the_same_tenant(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@example.com', 'igreja-central');
        $existingUser = User::query()->create([
            'name' => 'Carlos Pereira',
            'email' => 'tesoureiro@example.com',
            'password' => 'existing-password', // pragma: allowlist secret
        ]);
        ChurchUser::query()->create([
            'church_id' => $church->id,
            'user_id' => $existingUser->id,
            'role' => 'treasurer',
            'status' => 'active',
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-123'))
            ->postJson('/api/v1/church-users', $this->validPayload([
                'email' => 'tesoureiro@example.com',
                'role' => 'treasurer',
            ]));

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Este usuario ja esta associado a esta igreja.')
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('church_user', 2);
    }

    public function test_it_blocks_cross_tenant_reuse_without_side_effects(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@example.com', 'igreja-central');
        [, $otherChurch] = $this->seedMembership('administrator', 'outra-admin@example.com', 'igreja-esperanca');
        $existingUser = User::query()->create([
            'name' => 'Nome Original',
            'email' => 'compartilhado@example.com',
            'password' => 'original-password', // pragma: allowlist secret
        ]);
        ChurchUser::query()->create([
            'church_id' => $otherChurch->id,
            'user_id' => $existingUser->id,
            'role' => 'treasurer',
            'status' => 'active',
        ]);
        $originalPasswordHash = (string) $existingUser->password;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-123'))
            ->postJson('/api/v1/church-users', $this->validPayload([
                'name' => 'Nome Alterado',
                'email' => 'compartilhado@example.com',
                'password' => 'nova-senha-segura', // pragma: allowlist secret
                'password_confirmation' => 'nova-senha-segura', // pragma: allowlist secret
                'role' => 'secretary',
            ]));

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Este email ja pertence a outra igreja. O reaproveitamento ainda nao esta disponivel.')
            ->assertJsonValidationErrors(['email']);

        $existingUser->refresh();

        self::assertSame('Nome Original', $existingUser->name);
        self::assertSame($originalPasswordHash, $existingUser->password);
        $this->assertDatabaseMissing('church_user', [
            'church_id' => $church->id,
            'user_id' => $existingUser->id,
        ]);
        $this->assertDatabaseCount('users', 3);
        $this->assertDatabaseCount('church_user', 3);
    }

    public function test_it_rejects_roles_outside_the_mvp_allowlist(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@example.com', 'igreja-central');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-123'))
            ->postJson('/api/v1/church-users', $this->validPayload([
                'role' => 'administrator',
            ]));

        $response
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Revise os campos obrigatorios e tente novamente.')
            ->assertJsonValidationErrors(['role']);
    }

    public function test_it_requires_administrator_role_to_create_church_users(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123'))
            ->postJson('/api/v1/church-users', $this->validPayload());

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('church_user', 1);
    }

    public function test_created_treasurer_can_authenticate_and_access_treasury_from_the_first_login(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@example.com', 'igreja-central');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-123'))
            ->postJson('/api/v1/church-users', $this->validPayload([
                'email' => 'tesoureiro@example.com',
                'role' => 'treasurer',
            ]))
            ->assertCreated();

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'tesoureiro@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonPath('data.role', 'treasurer')
            ->assertJsonPath('data.roles.0', 'treasurer');

        $createdUser = User::query()->where('email', 'tesoureiro@example.com')->firstOrFail();
        $token = $this->createInternalJwt($createdUser->id, $church->id, ['treasurer'], 'session-456');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/backoffice/access/treasury')
            ->assertOk()
            ->assertJsonPath('message', 'Acesso liberado.');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/backoffice/access/secretaria')
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');
    }

    public function test_created_secretary_can_authenticate_with_the_assigned_role(): void
    {
        $this->assertCreatedUserCanAuthenticateWithRole('secretary', 'secretaria@example.com');
    }

    public function test_created_leadership_user_can_authenticate_with_the_assigned_role(): void
    {
        $this->assertCreatedUserCanAuthenticateWithRole('leadership', 'lideranca@example.com');
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
     * @return array{name: string, email: string, password: string, password_confirmation: string, role: string}
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Carlos Pereira',
            'email' => 'carlos@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'role' => 'treasurer',
        ], $overrides);
    }

    private function assertCreatedUserCanAuthenticateWithRole(string $role, string $email): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@example.com', 'igreja-central');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-123'))
            ->postJson('/api/v1/church-users', $this->validPayload([
                'email' => $email,
                'role' => $role,
            ]))
            ->assertCreated();

        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'secret-password', // pragma: allowlist secret
        ])
            ->assertOk()
            ->assertJsonPath('data.role', $role)
            ->assertJsonPath('data.roles.0', $role);
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
