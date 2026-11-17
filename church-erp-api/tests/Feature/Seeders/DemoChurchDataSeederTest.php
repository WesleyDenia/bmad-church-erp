<?php

namespace Tests\Feature\Seeders;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Models\FinancialEntryAudit;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Domain\People\Models\Person;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoChurchDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_isolated_demo_data_for_both_churches_and_can_be_run_again(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        foreach ([
            ['Igreja 1', 'igreja-1', 'Tester_1', 'igreja_1@teste.com'],
            ['Igreja 2', 'igreja-2', 'Tester_2', 'igreja_2@teste.com'],
        ] as [$name, $slug, $adminName, $adminEmail]) {
            $church = Church::query()->where('slug', $slug)->firstOrFail();
            $admin = User::query()->where('email', $adminEmail)->firstOrFail();

            $this->assertSame($name, $church->name);
            $this->assertSame($adminName, $admin->name);
            $this->assertTrue(Hash::check('password', $admin->password)); // pragma: allowlist secret
            $this->assertDatabaseHas('church_user', [
                'church_id' => $church->id,
                'user_id' => $admin->id,
                'role' => 'administrator',
                'status' => 'active',
            ]);
            $this->assertSame(1, ChurchUser::query()
                ->where('church_id', $church->id)
                ->where('user_id', $admin->id)
                ->count());

            $this->assertGreaterThanOrEqual(50, Person::query()
                ->forChurch($church->id)
                ->where('person_type', 'member')
                ->count());
            $this->assertGreaterThan(0, Person::query()
                ->forChurch($church->id)
                ->where('person_type', 'visitor')
                ->whereIn('status', ['new', 'follow_up_needed'])
                ->count());
            $this->assertGreaterThan(0, Person::query()
                ->forChurch($church->id)
                ->whereNull('phone')
                ->whereNull('email')
                ->count());

            $this->assertGreaterThanOrEqual(5, FinancialCategory::query()
                ->forChurch($church->id)
                ->count());
            $this->assertGreaterThanOrEqual(200, FinancialEntry::query()
                ->forChurch($church->id)
                ->count());
            $this->assertSame(2, FinancialEntry::query()
                ->forChurch($church->id)
                ->distinct()
                ->pluck('entry_type')
                ->count());
            $this->assertGreaterThan(0, FinancialEntryAudit::query()
                ->forChurch($church->id)
                ->count());
        }

        $this->assertSame(2, Church::query()->count());
        $this->assertSame(400, FinancialEntry::query()->withoutGlobalScopes()->count());
    }
}
