<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Models\Church;
use App\Domain\People\Services\ProvisionInitialPersonCategoriesService;
use App\Domain\Settings\Exceptions\TermIsImmutable;
use App\Domain\Settings\Models\Term;
use App\Domain\Settings\Models\TermsAcceptance;
use App\Domain\Settings\Services\RecordTermsAcceptanceService;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class InitialChurchSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_onboarding_terms_are_read_from_the_latest_published_term(): void
    {
        $latest = Term::query()->create([
            'version' => 2,
            'content' => 'Termos de uso revisados.',
            'content_hash' => hash('sha256', 'Termos de uso revisados.'),
            'published_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/onboarding/terms');

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $latest->id)
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.content', 'Termos de uso revisados.')
            ->assertJsonPath('data.content_hash', hash('sha256', 'Termos de uso revisados.'));

        $this->assertDatabaseHas('terms', [
            'version' => 1,
            'content_hash' => hash('sha256', (string) DB::table('settings')
                ->where('key', 'legal.terms_of_use.v1')
                ->value('value')),
        ]);
    }

    public function test_initial_setup_requires_explicit_terms_acceptance(): void
    {
        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => false,
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.terms_accepted.0',
                'Voce precisa aceitar os termos para concluir a configuracao.',
            );

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('terms_acceptances', 0);
    }

    public function test_initial_setup_creates_church_admin_user_and_tenant_link(): void
    {
        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.church.name', 'Igreja Central')
            ->assertJsonPath('data.admin.email', 'maria@example.com')
            ->assertJsonPath('data.role', 'administrator')
            ->assertJsonPath('data.message', 'Configuracao inicial concluida. Agora voce pode entrar no sistema.');

        $this->assertDatabaseHas('churches', [
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);

        $user = User::query()->where('email', 'maria@example.com')->firstOrFail();

        $this->assertTrue(Hash::check('secret-password', $user->password)); // pragma: allowlist secret

        $churchId = $response->json('data.church.id');

        $this->assertDatabaseHas('church_user', [
            'church_id' => $churchId,
            'user_id' => $user->id,
            'role' => 'administrator',
            'status' => 'active',
        ]);

        $term = Term::query()->orderByDesc('version')->firstOrFail();

        $this->assertDatabaseHas('terms_acceptances', [
            'user_id' => $user->id,
            'term_id' => $term->id,
            'terms_content_hash' => $term->content_hash,
        ]);

        $this->assertDatabaseHas('financial_categories', [
            'church_id' => $churchId,
            'slug' => 'dizimos',
            'kind' => 'income',
        ]);

        $this->assertDatabaseHas('financial_categories', [
            'church_id' => $churchId,
            'slug' => 'despesas-operacionais',
            'kind' => 'expense',
        ]);

        $this->assertDatabaseHas('person_categories', [
            'church_id' => $churchId,
            'slug' => 'membros',
        ]);

        $this->assertDatabaseHas('person_categories', [
            'church_id' => $churchId,
            'slug' => 'visitantes',
        ]);
    }

    public function test_initial_setup_returns_simple_validation_errors(): void
    {
        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            'church_name' => '',
            'admin_name' => '',
            'admin_email' => 'not-an-email',
            'password' => 'short', // pragma: allowlist secret
            'password_confirmation' => 'different', // pragma: allowlist secret
            'terms_accepted' => false,
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'church_name',
                'admin_name',
                'admin_email',
                'password',
                'terms_accepted',
            ])
            ->assertJsonPath('message', 'Revise os campos destacados e tente novamente.');
    }

    public function test_initial_setup_blocks_duplicate_admin_email(): void
    {
        User::factory()->create([
            'email' => 'maria@example.com',
        ]);

        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['admin_email'])
            ->assertJsonPath('errors.admin_email.0', 'Este email ja esta em uso.');

        $this->assertDatabaseMissing('churches', [
            'name' => 'Igreja Central',
        ]);
    }

    public function test_initial_setup_blocks_duplicate_church_slug(): void
    {
        $payload = [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ];

        $this->postJson('/api/v1/onboarding/initial-setup', $payload)
            ->assertCreated();

        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            ...$payload,
            'admin_email' => 'outra@example.com',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['church_name'])
            ->assertJsonPath('errors.church_name.0', 'Ja existe uma igreja configurada com este nome.');

        $this->assertDatabaseCount('churches', 1);
        $this->assertDatabaseMissing('users', [
            'email' => 'outra@example.com',
        ]);
    }

    public function test_initial_setup_can_be_reprocessed_without_creating_duplicates(): void
    {
        $payload = [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ];

        $firstResponse = $this->postJson('/api/v1/onboarding/initial-setup', $payload);
        $churchId = $firstResponse->json('data.church.id');

        $this->postJson('/api/v1/onboarding/initial-setup', $payload)
            ->assertCreated()
            ->assertJsonPath('data.church.id', $churchId)
            ->assertJsonPath('data.admin.email', 'maria@example.com');

        $this->assertDatabaseCount('churches', 1);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('church_user', 1);
        $this->assertDatabaseCount('financial_categories', 4);
        $this->assertDatabaseCount('person_categories', 3);
        $this->assertDatabaseCount('terms_acceptances', 1);
    }

    public function test_initial_setup_reprocessing_requires_the_existing_admin_password(): void
    {
        $payload = [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ];

        $this->postJson('/api/v1/onboarding/initial-setup', $payload)
            ->assertCreated();

        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            ...$payload,
            'password' => 'wrong-password', // pragma: allowlist secret
            'password_confirmation' => 'wrong-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['church_name', 'admin_email'])
            ->assertJsonPath('errors.church_name.0', 'Ja existe uma igreja configurada com este nome.')
            ->assertJsonPath('errors.admin_email.0', 'Este email ja esta em uso.');
    }

    public function test_a_term_cannot_be_updated_or_deleted(): void
    {
        $term = Term::query()->firstOrFail();
        $term->content = 'Tentativa de revisao';

        $this->expectException(TermIsImmutable::class);
        $term->save();
    }

    public function test_a_term_cannot_be_deleted(): void
    {
        $this->expectException(TermIsImmutable::class);

        Term::query()->firstOrFail()->delete();
    }

    public function test_a_term_cannot_be_changed_with_a_direct_database_query(): void
    {
        $this->expectException(QueryException::class);

        DB::table('terms')->where('id', Term::query()->firstOrFail()->id)->update([
            'content' => 'Tentativa de revisao direta',
        ]);
    }

    public function test_the_same_user_can_accept_a_new_term_version_without_losing_the_previous_acceptance(): void
    {
        $user = User::factory()->create();
        $firstTerm = Term::query()->firstOrFail();
        $nextTerm = Term::query()->create([
            'version' => 2,
            'content' => 'Termos de uso versao dois.',
            'content_hash' => hash('sha256', 'Termos de uso versao dois.'),
            'published_at' => now(),
        ]);
        $service = app(RecordTermsAcceptanceService::class);

        $firstAcceptance = $service->record($user, $firstTerm);
        $sameAcceptance = $service->record($user, $firstTerm);
        $secondAcceptance = $service->record($user, $nextTerm);

        $this->assertSame($firstAcceptance->id, $sameAcceptance->id);
        $this->assertNotSame($firstAcceptance->id, $secondAcceptance->id);
        $this->assertDatabaseCount('terms_acceptances', 2);
        $this->assertDatabaseHas('terms_acceptances', [
            'user_id' => $user->id,
            'term_id' => $firstTerm->id,
        ]);
        $this->assertDatabaseHas('terms_acceptances', [
            'user_id' => $user->id,
            'term_id' => $nextTerm->id,
        ]);
    }

    public function test_initial_setup_returns_clear_error_and_rolls_back_when_category_provisioning_fails(): void
    {
        $this->app->bind(ProvisionInitialPersonCategoriesService::class, function (): ProvisionInitialPersonCategoriesService {
            return new class extends ProvisionInitialPersonCategoriesService
            {
                public function provision(Church $church): void
                {
                    throw new RuntimeException('Provisioning failed.');
                }
            };
        });

        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            'church_name' => 'Igreja Esperanca',
            'admin_name' => 'Ana Lima',
            'admin_email' => 'ana@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ]);

        $response
            ->assertStatus(500)
            ->assertJsonPath('message', 'Nao foi possivel concluir a configuracao inicial agora. Tente novamente.');

        $this->assertDatabaseMissing('churches', [
            'slug' => 'igreja-esperanca',
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'ana@example.com',
        ]);

        $this->assertDatabaseCount('financial_categories', 0);
        $this->assertDatabaseCount('person_categories', 0);
    }

    public function test_initial_setup_rolls_back_when_terms_acceptance_cannot_be_recorded(): void
    {
        $this->app->bind(RecordTermsAcceptanceService::class, function (): RecordTermsAcceptanceService {
            return new class extends RecordTermsAcceptanceService
            {
                public function record(User $user, Term $terms): TermsAcceptance
                {
                    throw new RuntimeException('Terms acceptance failed.');
                }
            };
        });

        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            'church_name' => 'Igreja Esperanca',
            'admin_name' => 'Ana Lima',
            'admin_email' => 'ana@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'password_confirmation' => 'secret-password', // pragma: allowlist secret
            'terms_accepted' => true,
        ]);

        $response->assertStatus(500);
        $this->assertDatabaseMissing('churches', ['slug' => 'igreja-esperanca']);
        $this->assertDatabaseMissing('users', ['email' => 'ana@example.com']);
        $this->assertDatabaseCount('terms_acceptances', 0);
    }
}
