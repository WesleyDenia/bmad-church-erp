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
            'password' => 'secret-password',
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
        openssl_sign($signatureInput, $signature, self::DEV_INTERNAL_JWT_PRIVATE_KEY, OPENSSL_ALGO_SHA256);

        return "{$signatureInput}.{$this->base64UrlEncode($signature)}";
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
