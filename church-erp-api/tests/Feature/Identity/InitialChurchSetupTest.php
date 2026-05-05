<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Models\Church;
use App\Domain\People\Services\ProvisionInitialPersonCategoriesService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class InitialChurchSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_initial_setup_creates_church_admin_user_and_tenant_link(): void
    {
        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
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

        $this->assertTrue(Hash::check('secret-password', $user->password));

        $churchId = $response->json('data.church.id');

        $this->assertDatabaseHas('church_user', [
            'church_id' => $churchId,
            'user_id' => $user->id,
            'role' => 'administrator',
            'status' => 'active',
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
            'password' => 'short',
            'password_confirmation' => 'different',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'church_name',
                'admin_name',
                'admin_email',
                'password',
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
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
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
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
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
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
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
    }

    public function test_initial_setup_reprocessing_requires_the_existing_admin_password(): void
    {
        $payload = [
            'church_name' => 'Igreja Central',
            'admin_name' => 'Maria Silva',
            'admin_email' => 'maria@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ];

        $this->postJson('/api/v1/onboarding/initial-setup', $payload)
            ->assertCreated();

        $response = $this->postJson('/api/v1/onboarding/initial-setup', [
            ...$payload,
            'password' => 'wrong-password',
            'password_confirmation' => 'wrong-password',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['church_name', 'admin_email'])
            ->assertJsonPath('errors.church_name.0', 'Ja existe uma igreja configurada com este nome.')
            ->assertJsonPath('errors.admin_email.0', 'Este email ja esta em uso.');
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
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
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
}
