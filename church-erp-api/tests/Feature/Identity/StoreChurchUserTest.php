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
        self::assertTrue(Hash::check('secret-password', $createdUser->password));
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
            'password' => 'existing-password',
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
            'password' => 'original-password',
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
                'password' => 'nova-senha-segura',
                'password_confirmation' => 'nova-senha-segura',
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
            'password' => 'secret-password',
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

    /**
     * @return array{name: string, email: string, password: string, password_confirmation: string, role: string}
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Carlos Pereira',
            'email' => 'carlos@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
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
            'password' => 'secret-password',
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
        openssl_sign($signatureInput, $signature, self::DEV_INTERNAL_JWT_PRIVATE_KEY, OPENSSL_ALGO_SHA256);

        return "{$signatureInput}.{$this->base64UrlEncode($signature)}";
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
