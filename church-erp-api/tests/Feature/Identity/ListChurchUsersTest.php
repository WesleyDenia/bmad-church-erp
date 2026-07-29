<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ListChurchUsersTest extends TestCase
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

    public function test_administrator_can_list_only_memberships_from_the_current_tenant(): void
    {
        [$admin, $church, $adminMembership] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        [$treasurer] = $this->seedMembership('treasurer', 'tesoureiro@central.test', 'igreja-central', $church);
        [$leadership] = $this->seedMembership('leadership', 'lideranca@central.test', 'igreja-central', $church, 'inactive');
        $this->seedMembership('secretary', 'secretaria@outra.test', 'igreja-esperanca');

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-list-1'))
            ->getJson('/api/v1/church-users');

        $rowsByEmail = collect($response->json('data'))->keyBy('user.email');

        $response
            ->assertOk()
            ->assertJsonCount(3, 'data');

        self::assertSame($adminMembership->id, $rowsByEmail['admin@central.test']['membership_id']);
        self::assertSame('administrator', $rowsByEmail['admin@central.test']['membership']['role']);
        self::assertSame('active', $rowsByEmail['admin@central.test']['membership']['status']);
        self::assertTrue($rowsByEmail['admin@central.test']['is_current_user']);
        self::assertSame('inactive', $rowsByEmail['lideranca@central.test']['membership']['status']);
        self::assertFalse($rowsByEmail['lideranca@central.test']['is_current_user']);
        self::assertSame('treasurer', $rowsByEmail['tesoureiro@central.test']['membership']['role']);
        self::assertArrayNotHasKey('secretaria@outra.test', $rowsByEmail->all());

        $ids = collect($response->json('data'))->pluck('membership_id')->all();

        self::assertContains($adminMembership->id, $ids);
        self::assertContains(
            ChurchUser::query()->where('user_id', $treasurer->id)->where('church_id', $church->id)->value('id'),
            $ids,
        );
        self::assertContains(
            ChurchUser::query()->where('user_id', $leadership->id)->where('church_id', $church->id)->value('id'),
            $ids,
        );
    }

    public function test_non_administrator_cannot_list_church_users(): void
    {
        [$secretary, $church] = $this->seedMembership('secretary', 'secretaria@central.test', 'igreja-central');

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($secretary->id, $church->id, ['secretary'], 'session-list-2'))
            ->getJson('/api/v1/church-users')
            ->assertForbidden()
            ->assertJsonPath('message', 'Acesso negado para esta area.');
    }

    public function test_list_marks_the_current_session_membership_explicitly(): void
    {
        [$admin, $church, $adminMembership] = $this->seedMembership('administrator', 'admin@central.test', 'igreja-central');
        $this->seedMembership('treasurer', 'tesoureiro@central.test', 'igreja-central', $church);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($admin->id, $church->id, ['administrator'], 'session-list-3'))
            ->getJson('/api/v1/church-users');

        $currentRow = collect($response->json('data'))
            ->firstWhere('membership_id', $adminMembership->id);

        self::assertIsArray($currentRow);
        self::assertTrue($currentRow['is_current_user']);
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
