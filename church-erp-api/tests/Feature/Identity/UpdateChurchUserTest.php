<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class UpdateChurchUserTest extends TestCase
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

    public function test_administrator_can_update_only_the_role_on_the_same_membership(): void
    {
        Carbon::setTestNow('2026-06-01 10:00:00');
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [, , $membership] = $this->seedMembership('treasurer', 'tesoureiro@central.test', 'igreja-central', $church);
        $originalCreatedAt = $membership->created_at;

        Carbon::setTestNow('2026-06-01 10:30:00');
        Log::spy();

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-1'))
            ->patchJson("/api/v1/church-users/{$membership->id}", [
                'role' => 'leadership',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.membership_id', $membership->id)
            ->assertJsonPath('data.user.email', 'tesoureiro@central.test')
            ->assertJsonPath('data.membership.role', 'leadership')
            ->assertJsonPath('data.membership.status', 'active')
            ->assertJsonPath('data.action', 'updated')
            ->assertJsonPath('data.message', 'Usuario atualizado com sucesso.');

        $membership->refresh();

        self::assertSame('leadership', $membership->role);
        self::assertSame('active', $membership->status);
        self::assertTrue($membership->created_at->equalTo($originalCreatedAt));
        self::assertTrue($membership->updated_at->greaterThan($originalCreatedAt));

        Log::shouldHaveReceived('info')
            ->once()
            ->withArgs(function (string $message, array $context) use ($admin, $church, $membership): bool {
                return $message === 'church_user_membership_updated'
                    && $context['actor_user_id'] === $admin->id
                    && $context['target_membership_id'] === $membership->id
                    && $context['target_user_id'] === $membership->user_id
                    && $context['church_id'] === $church->id
                    && $context['changes'] === [
                        'role' => [
                            'from' => 'treasurer',
                            'to' => 'leadership',
                        ],
                    ];
            });
    }

    public function test_administrator_can_update_only_the_status_and_reactivate_the_same_membership(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [, , $membership] = $this->seedMembership('secretary', 'secretaria@central.test', 'igreja-central', $church);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-2'))
            ->patchJson("/api/v1/church-users/{$membership->id}", [
                'status' => 'inactive',
            ])
            ->assertOk()
            ->assertJsonPath('data.membership.status', 'inactive');

        $membership->refresh();
        self::assertSame('inactive', $membership->status);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-3'))
            ->patchJson("/api/v1/church-users/{$membership->id}", [
                'status' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('data.membership_id', $membership->id)
            ->assertJsonPath('data.membership.role', 'secretary')
            ->assertJsonPath('data.membership.status', 'active');

        $membership->refresh();
        self::assertSame('active', $membership->status);
    }

    public function test_administrator_can_update_role_and_status_together_on_the_same_membership(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [, , $membership] = $this->seedMembership('treasurer', 'tesoureiro@central.test', 'igreja-central', $church);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-3b'))
            ->patchJson("/api/v1/church-users/{$membership->id}", [
                'role' => 'leadership',
                'status' => 'inactive',
            ])
            ->assertOk()
            ->assertJsonPath('data.membership_id', $membership->id)
            ->assertJsonPath('data.membership.role', 'leadership')
            ->assertJsonPath('data.membership.status', 'inactive');

        $membership->refresh();

        self::assertSame('leadership', $membership->role);
        self::assertSame('inactive', $membership->status);
    }

    public function test_it_rejects_updates_for_memberships_that_are_currently_administrator(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [, , $targetMembership] = $this->seedMembership('administrator', 'coadmin@central.test', 'igreja-central', $church);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-4'))
            ->patchJson("/api/v1/church-users/{$targetMembership->id}", [
                'status' => 'inactive',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Memberships administrativos sao somente leitura nesta area.')
            ->assertJsonValidationErrors(['membership']);
    }

    public function test_it_requires_at_least_one_mutable_field(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [, , $membership] = $this->seedMembership('treasurer', 'tesoureiro@central.test', 'igreja-central', $church);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-5'))
            ->patchJson("/api/v1/church-users/{$membership->id}", [])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Informe pelo menos perfil ou status para atualizar.')
            ->assertJsonValidationErrors(['payload']);
    }

    public function test_non_administrator_cannot_update_church_users(): void
    {
        [$secretary, $church] = $this->seedMembership('secretary', 'secretaria@central.test', 'igreja-central');
        [, , $membership] = $this->seedMembership('treasurer', 'tesoureiro@central.test', 'igreja-central', $church);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($secretary->id, $church->id, ['secretary'], 'session-update-6'))
            ->patchJson("/api/v1/church-users/{$membership->id}", [
                'role' => 'leadership',
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');
    }

    public function test_it_returns_not_found_for_memberships_outside_the_current_tenant(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [, , $otherMembership] = $this->seedMembership('treasurer', 'tesoureiro@outra.test', 'igreja-esperanca');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-7'))
            ->patchJson("/api/v1/church-users/{$otherMembership->id}", [
                'role' => 'leadership',
            ])
            ->assertNotFound()
            ->assertJsonPath('message', 'Usuario da igreja nao encontrado.');
    }

    public function test_inactive_membership_blocks_login_and_invalidates_the_next_authenticated_request(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [$targetUser, , $targetMembership] = $this->seedMembership('secretary', 'secretaria@central.test', 'igreja-central', $church);
        $targetToken = $this->createInternalJwt($targetUser->id, $church->id, ['secretary'], 'session-target-1');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-8'))
            ->patchJson("/api/v1/church-users/{$targetMembership->id}", [
                'status' => 'inactive',
            ])
            ->assertOk()
            ->assertJsonPath('data.membership.status', 'inactive');

        $this->withHeader('Authorization', "Bearer {$targetToken}")
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Nao foi possivel aplicar a igreja correta.');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'secretaria@central.test',
            'password' => 'secret-password', // pragma: allowlist secret
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Nao foi possivel aplicar a igreja correta.');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-9'))
            ->patchJson("/api/v1/church-users/{$targetMembership->id}", [
                'status' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('data.membership.status', 'active');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'secretaria@central.test',
            'password' => 'secret-password', // pragma: allowlist secret
        ])
            ->assertOk()
            ->assertJsonPath('data.role', 'secretary');
    }

    public function test_role_change_takes_effect_on_the_next_authorized_request_even_with_an_old_token_claim(): void
    {
        [$admin, $church] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [$targetUser, , $targetMembership] = $this->seedMembership('treasurer', 'tesoureiro@central.test', 'igreja-central', $church);
        $targetToken = $this->createInternalJwt($targetUser->id, $church->id, ['treasurer'], 'session-target-2');

        $this->withHeader('Authorization', "Bearer {$targetToken}")
            ->getJson('/api/v1/backoffice/access/treasury')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$targetToken}")
            ->getJson('/api/v1/backoffice/access/leadership')
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-update-10'))
            ->patchJson("/api/v1/church-users/{$targetMembership->id}", [
                'role' => 'leadership',
            ])
            ->assertOk()
            ->assertJsonPath('data.membership.role', 'leadership');

        $this->withHeader('Authorization', "Bearer {$targetToken}")
            ->getJson('/api/v1/backoffice/access/treasury')
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');

        $this->withHeader('Authorization', "Bearer {$targetToken}")
            ->getJson('/api/v1/backoffice/access/leadership')
            ->assertOk()
            ->assertJsonPath('message', 'Acesso liberado.');

        $this->withHeader('Authorization', "Bearer {$targetToken}")
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'leadership')
            ->assertJsonPath('data.roles.0', 'leadership');
    }

    /**
     * @return array{0: User, 1: Church, 2: ChurchUser}
     */
    private function seedMembership(
        string $role,
        string $email,
        string $slug,
        ?Church $church = null,
        string $status = 'active',
    ): array {
        $church ??= Church::query()->create([
            'name' => ucfirst(str_replace('-', ' ', $slug)),
            'slug' => $slug,
        ]);

        $user = User::query()->create([
            'name' => ucfirst(strtok($email, '@')).' Pessoa',
            'email' => $email,
            'password' => 'secret-password', // pragma: allowlist secret
        ]);

        $membership = ChurchUser::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => $status,
        ]);

        return [$user, $church, $membership];
    }

    /**
     * @param  list<string>  $roles
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
