<?php

namespace Tests\Unit\Identity;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Services\CreateChurchUserService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateChurchUserServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_service_persists_a_new_user_and_active_membership(): void
    {
        $church = Church::query()->create([
            'name' => 'Igreja Esperanca',
            'slug' => 'igreja-esperanca',
        ]);

        $service = $this->app->make(CreateChurchUserService::class);

        $result = $service->create([
            'church_id' => $church->id,
            'name' => 'Carlos Pereira',
            'email' => 'carlos@example.com',
            'password' => 'secret-password', // pragma: allowlist secret
            'role' => 'treasurer',
        ]);

        self::assertSame('carlos@example.com', $result['user']->email);
        self::assertSame($church->id, $result['membership']->church_id);
        self::assertSame('treasurer', $result['membership']->role);
        self::assertSame('active', $result['membership']->status);
    }

    public function test_create_service_rolls_back_when_membership_creation_fails(): void
    {
        $service = $this->app->make(CreateChurchUserService::class);

        try {
            $service->create([
                'church_id' => 999999,
                'name' => 'Carlos Pereira',
                'email' => 'carlos@example.com',
                'password' => 'secret-password', // pragma: allowlist secret
                'role' => 'treasurer',
            ]);

            self::fail('Expected membership persistence failure to bubble up.');
        } catch (QueryException) {
            self::assertDatabaseCount('users', 0);
            self::assertDatabaseCount('church_user', 0);
        }
    }
}
