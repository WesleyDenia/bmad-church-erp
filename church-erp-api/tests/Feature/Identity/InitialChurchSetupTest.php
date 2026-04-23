<?php

namespace Tests\Feature\Identity;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
}
