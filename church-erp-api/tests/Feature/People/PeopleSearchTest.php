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

class PeopleSearchTest extends TestCase
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

    public function test_secretary_and_administrator_can_search_members_and_visitors_from_current_tenant(): void
    {
        foreach (['secretary', 'administrator'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            [, $otherChurch] = $this->seedMembership('secretary', "outra-{$role}@example.com", "outra-{$role}");

            $this->createPerson($church->id, [
                'person_type' => 'visitor',
                'status' => 'new',
                'display_name' => 'ana visitante',
                'email' => 'ana@example.com',
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'member',
                'status' => 'active',
                'display_name' => 'Ana Membro',
                'phone' => '11999990000',
            ]);
            $this->createPerson($church->id, [
                'person_type' => 'member',
                'status' => 'needs_update',
                'display_name' => 'Bruno Membro',
                'phone' => '11888880000',
                'email' => 'bruno@example.com',
            ]);
            $this->createPerson($otherChurch->id, [
                'person_type' => 'visitor',
                'status' => 'new',
                'display_name' => 'Nome Outro Tenant',
                'email' => 'vazado@example.com',
            ]);

            $response = $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->getJson('/api/v1/people?q= ANA &person_type=all&status=all&contact=all&per_page=15');

            $response
                ->assertOk()
                ->assertJsonPath('data.0.display_name', 'Ana Membro')
                ->assertJsonPath('data.0.person_type', 'member')
                ->assertJsonPath('data.0.person_type_label', 'Membro')
                ->assertJsonPath('data.0.status_label', 'Ativo')
                ->assertJsonPath('data.0.contact_summary', 'Telefone informado')
                ->assertJsonPath('data.0.primary_action_href', '/secretaria/membros/'.$response->json('data.0.id').'/editar')
                ->assertJsonPath('data.0.primary_action_label', 'Abrir cadastro')
                ->assertJsonPath('data.1.display_name', 'ana visitante')
                ->assertJsonPath('data.1.person_type', 'visitor')
                ->assertJsonPath('data.1.person_type_label', 'Visitante')
                ->assertJsonPath('data.1.status_label', 'Novo')
                ->assertJsonPath('data.1.contact_summary', 'Email informado')
                ->assertJsonPath('data.1.primary_action_href', '/secretaria/visitantes/'.$response->json('data.1.id').'/editar')
                ->assertJsonPath('meta.per_page', 15)
                ->assertJsonPath('meta.total', 2)
                ->assertJsonMissing(['Nome Outro Tenant', 'vazado@example.com', 'ana@example.com', '11999990000'])
                ->assertJsonMissingPath('data.0.church_id')
                ->assertJsonMissingPath('data.0.email')
                ->assertJsonMissingPath('data.0.phone')
                ->assertJsonMissingPath('data.0.last_contacted_at')
                ->assertJsonMissingPath('data.0.created_at')
                ->assertJsonMissingPath('data.0.updated_at')
                ->assertJsonMissingPath('data.people');
        }
    }

    public function test_forbidden_roles_missing_session_and_inactive_membership_do_not_receive_pii_or_counts(): void
    {
        foreach (['treasurer', 'leadership'] as $role) {
            [$user, $church] = $this->seedMembership($role, "{$role}@example.com", "igreja-{$role}");
            $this->createPerson($church->id, [
                'display_name' => 'Pessoa Protegida',
                'email' => 'protegida@example.com',
            ]);

            $this
                ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, [$role], "session-{$role}"))
                ->getJson('/api/v1/people')
                ->assertForbidden()
                ->assertJsonPath('message', 'Acesso negado para esta area.')
                ->assertJsonMissing(['Pessoa Protegida', 'protegida@example.com'])
                ->assertJsonMissingPath('meta.total');
        }

        $this
            ->withHeader('Authorization', '')
            ->getJson('/api/v1/people')
            ->assertUnauthorized()
            ->assertJsonMissingPath('meta.total');

        [$inactiveUser, $inactiveChurch, $membership] = $this->seedMembership('secretary', 'inactive@example.com', 'igreja-inativa');
        $membership->update(['status' => 'inactive']);
        $this->createPerson($inactiveChurch->id, [
            'display_name' => 'Pessoa Inativa Protegida',
            'email' => 'inativa@example.com',
        ]);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($inactiveUser->id, $inactiveChurch->id, ['secretary'], 'session-inactive'))
            ->getJson('/api/v1/people')
            ->assertUnauthorized()
            ->assertJsonMissing(['Pessoa Inativa Protegida', 'inativa@example.com'])
            ->assertJsonMissingPath('meta.total');
    }

    public function test_filters_status_lists_contact_semantics_pagination_and_ordering_are_deterministic(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');

        $this->createPerson($church->id, ['person_type' => 'visitor', 'status' => 'follow_up_needed', 'display_name' => 'Ana Sem Contato']);
        $this->createPerson($church->id, ['person_type' => 'visitor', 'status' => 'new', 'display_name' => 'Bia Telefone', 'phone' => '11999990000']);
        $this->createPerson($church->id, ['person_type' => 'member', 'status' => 'needs_update', 'display_name' => 'Caio Email', 'email' => 'caio@example.com']);
        $this->createPerson($church->id, ['person_type' => 'member', 'status' => 'active', 'display_name' => 'Davi Completo', 'phone' => '11888880000', 'email' => 'davi@example.com']);
        $this->createPerson($church->id, ['person_type' => 'visitor', 'status' => 'contacted', 'display_name' => 'Eva Contatada']);
        $this->createPerson($church->id, ['person_type' => 'member', 'status' => 'inactive', 'display_name' => 'Fabio Inativo Sem Contato']);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/people?person_type=visitor&status=new,follow_up_needed&contact=all')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.display_name', 'Ana Sem Contato')
            ->assertJsonPath('data.1.display_name', 'Bia Telefone');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/people?contact=missing_contact')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.contact_summary', 'Contato pendente')
            ->assertJsonMissing(['Fabio Inativo Sem Contato']);

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/people?contact=phone_only')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.display_name', 'Bia Telefone');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/people?contact=email_only')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.display_name', 'Caio Email');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/people?contact=with_contact&per_page=2&page=2')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.display_name', 'Davi Completo');

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/people?per_page=2&page=99')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 99)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonCount(0, 'data');
    }

    public function test_invalid_query_params_repeated_arrays_and_long_q_are_rejected_before_querying_or_returning_pii(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');
        $this->createPerson($church->id, [
            'display_name' => 'Pessoa Que Nao Deve Sair',
            'email' => 'bloqueada@example.com',
        ]);

        foreach ([
            'church_id=999',
            'tenant=outro',
            'role=administrator',
            'person_type=unknown',
            'status=unknown',
            'status=',
            'status=all,new',
            'status=new,%20follow_up_needed',
            'contact=unknown',
            'page=0',
            'per_page=0',
            'per_page=51',
            'status[]=active',
            'status=active&status=inactive',
            'q='.str_repeat('a', 81),
        ] as $query) {
            $this
                ->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/people?{$query}")
                ->assertUnprocessable()
                ->assertJsonMissing(['Pessoa Que Nao Deve Sair', 'bloqueada@example.com']);
        }
    }

    public function test_empty_q_defaults_per_page_and_home_links_are_supported(): void
    {
        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $token = $this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123');

        foreach (range(1, 16) as $index) {
            $this->createPerson($church->id, [
                'display_name' => sprintf('Pessoa %02d', $index),
            ]);
        }

        $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/people?q=%20%20')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.total', 16)
            ->assertJsonCount(15, 'data');

        $home = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/secretary/home')
            ->assertOk();

        $home->assertJsonFragment([
            'label' => 'Revisar pendencias de pessoas',
            'href' => '/secretaria/pessoas?person_type=all&status=all&contact=all',
            'state' => 'available',
        ]);
        $home->assertJsonFragment([
            'category' => 'missing_contact',
            'href' => '/secretaria/pessoas?person_type=all&status=all&contact=missing_contact',
        ]);
    }

    public function test_route_policy_resource_source_and_logs_are_safe(): void
    {
        $this->assertTrue(Gate::has('viewPeople'));

        $route = Route::getRoutes()->getByName('people.index');
        $this->assertNotNull($route);
        $this->assertContains('resolve.internal.session', $route->gatherMiddleware());
        $this->assertContains('throttle:secretary-people-read', $route->gatherMiddleware());

        $controller = file_get_contents(app_path('Http/Controllers/Api/V1/ListPeopleController.php'));
        $resource = file_get_contents(app_path('Http/Resources/PersonSearchResource.php'));
        $request = file_get_contents(app_path('Http/Requests/ListPeopleRequest.php'));
        $service = file_get_contents(app_path('Domain/People/Services/ListPeopleService.php'));

        self::assertIsString($controller);
        self::assertIsString($resource);
        self::assertIsString($request);
        self::assertIsString($service);
        self::assertStringContainsString('PersonSearchResource::collection($paginator)', $controller);
        self::assertStringContainsString("Person::query()\n            ->forChurch(\$churchId)", $service);
        self::assertStringContainsString('LOWER(display_name) LIKE ?', $service);
        self::assertStringNotContainsString('ResourceCollection', $controller.$resource);

        foreach (['church_id', 'user_id', 'role', 'roles', 'permission', 'permissions', 'tenant', 'tenant_id', 'scope', 'id', 'email', 'phone', 'created_at', 'updated_at', 'last_contacted_at'] as $forbiddenInput) {
            self::assertStringContainsString("'{$forbiddenInput}'", $request);
        }

        foreach (['church_id', 'email', 'phone', 'last_contacted_at', 'created_at', 'updated_at', 'user_id', 'audit'] as $forbiddenOutput) {
            self::assertStringNotContainsString("'{$forbiddenOutput}'", $resource);
        }

        Log::spy();

        [$user, $church] = $this->seedMembership('secretary', 'secretaria@example.com', 'igreja-central');
        $this->createPerson($church->id, ['display_name' => 'Pessoa Sem Log']);

        $this
            ->withHeader('Authorization', 'Bearer '.$this->createInternalJwt($user->id, $church->id, ['secretary'], 'session-123'))
            ->getJson('/api/v1/people')
            ->assertOk();

        Log::shouldNotHaveReceived('info');
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('error');
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
