<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BackofficeAreaAccessTest extends TestCase
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

    public function test_backoffice_access_allows_secretary_style_access_for_bootstrap_administrator(): void
    {
        [$user, $church] = $this->seedMembership('administrator');
        $token = $this->createInternalJwt($user->id, $church->id, ['administrator'], 'session-123');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/backoffice/access/secretaria');

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Acesso liberado.');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/backoffice/access/leadership')
            ->assertOk()
            ->assertJsonPath('message', 'Acesso liberado.');
    }

    public function test_backoffice_access_returns_forbidden_when_role_does_not_match_area(): void
    {
        [$user, $church] = $this->seedMembership('leadership');
        $token = $this->createInternalJwt($user->id, $church->id, ['leadership'], 'session-123');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/backoffice/access/treasury');

        $response
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');
    }

    public function test_backoffice_access_rejects_inactive_membership_before_authorizing_area(): void
    {
        [$user, $church, $membership] = $this->seedMembership('secretary');
        $membership->update(['status' => 'inactive']);

        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/backoffice/access/communications');

        $response
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Nao foi possivel aplicar a igreja correta.')
            ->assertJsonMissingPath('errors');
    }

    /**
     * @return array{0: User, 1: Church, 2?: ChurchUser}
     */
    private function seedMembership(string $role): array
    {
        $church = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);

        $user = User::query()->create([
            'name' => 'Maria Silva',
            'email' => 'maria@example.com',
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
