<?php

namespace Tests\Feature\Identity;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Services\ProvisionInitialFinancialCategoriesService;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Domain\People\Models\PersonCategory;
use App\Domain\People\Services\ProvisionInitialPersonCategoriesService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class InitialCategoryDefaultsTest extends TestCase
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

    public function test_defaults_endpoint_returns_only_the_active_tenant_categories(): void
    {
        [$user, $firstChurch] = $this->seedMembership('administrator', 'maria@example.com', 'igreja-central');
        [, $secondChurch] = $this->seedMembership('administrator', 'ana@example.com', 'igreja-esperanca');

        $financialService = $this->app->make(ProvisionInitialFinancialCategoriesService::class);
        $peopleService = $this->app->make(ProvisionInitialPersonCategoriesService::class);

        $financialService->provision($firstChurch);
        $peopleService->provision($firstChurch);
        $financialService->provision($secondChurch);
        $peopleService->provision($secondChurch);
        FinancialCategory::query()->withoutGlobalScopes()->create([
            'church_id' => $firstChurch->id,
            'name' => 'Categoria livre',
            'slug' => 'categoria-livre',
            'kind' => 'income',
            'is_default' => false,
        ]);
        PersonCategory::query()->withoutGlobalScopes()->create([
            'church_id' => $firstChurch->id,
            'name' => 'Lideranca local',
            'slug' => 'lideranca-local',
            'is_default' => false,
        ]);

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $firstChurch->id, ['administrator'], 'session-123'))
            ->getJson('/api/v1/categories/defaults');

        $response
            ->assertOk()
            ->assertJsonPath('data.financial_categories.0.slug', 'acao-social')
            ->assertJsonPath('data.financial_categories.3.slug', 'ofertas')
            ->assertJsonPath('data.person_categories.0.slug', 'membros')
            ->assertJsonPath('data.person_categories.2.slug', 'visitantes');

        $firstChurchFinancialCategoryIds = FinancialCategory::query()
            ->withoutGlobalScopes()
            ->where('church_id', $firstChurch->id)
            ->where('is_default', true)
            ->orderBy('slug')
            ->pluck('id')
            ->all();
        $firstChurchPersonCategoryIds = PersonCategory::query()
            ->withoutGlobalScopes()
            ->where('church_id', $firstChurch->id)
            ->where('is_default', true)
            ->orderBy('slug')
            ->pluck('id')
            ->all();

        $this->assertCount(4, $response->json('data.financial_categories'));
        $this->assertCount(3, $response->json('data.person_categories'));
        $this->assertSame($firstChurchFinancialCategoryIds, array_column($response->json('data.financial_categories'), 'id'));
        $this->assertSame($firstChurchPersonCategoryIds, array_column($response->json('data.person_categories'), 'id'));
        $this->assertNotContains('categoria-livre', array_column($response->json('data.financial_categories'), 'slug'));
        $this->assertNotContains('lideranca-local', array_column($response->json('data.person_categories'), 'slug'));
    }

    public function test_defaults_endpoint_requires_an_authenticated_session(): void
    {
        $response = $this->getJson('/api/v1/categories/defaults');

        $response
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sessao invalida. Entre novamente.');
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
