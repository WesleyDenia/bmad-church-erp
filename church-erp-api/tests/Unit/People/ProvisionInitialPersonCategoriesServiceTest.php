<?php

namespace Tests\Unit\People;

use App\Domain\Identity\Models\Church;
use App\Domain\People\Models\PersonCategory;
use App\Domain\People\Services\ProvisionInitialPersonCategoriesService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProvisionInitialPersonCategoriesServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_provision_is_idempotent_for_the_same_church(): void
    {
        $church = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);

        $service = $this->app->make(ProvisionInitialPersonCategoriesService::class);

        $service->provision($church);
        PersonCategory::query()
            ->withoutGlobalScopes()
            ->where('church_id', $church->id)
            ->where('slug', 'membros')
            ->update(['name' => 'Membros ativos']);
        PersonCategory::query()
            ->withoutGlobalScopes()
            ->where('church_id', $church->id)
            ->where('slug', 'visitantes')
            ->delete();
        $service->provision($church);

        self::assertSame(
            3,
            PersonCategory::query()->withoutGlobalScopes()->where('church_id', $church->id)->count(),
        );
        self::assertSame(
            'Membros ativos',
            PersonCategory::query()
                ->withoutGlobalScopes()
                ->where('church_id', $church->id)
                ->where('slug', 'membros')
                ->value('name'),
        );
        self::assertSame(
            1,
            PersonCategory::query()->withoutGlobalScopes()->where('church_id', $church->id)->where('slug', 'visitantes')->count(),
        );
    }

    public function test_provision_keeps_categories_isolated_by_church(): void
    {
        $firstChurch = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);

        $secondChurch = Church::query()->create([
            'name' => 'Igreja Esperanca',
            'slug' => 'igreja-esperanca',
        ]);

        $service = $this->app->make(ProvisionInitialPersonCategoriesService::class);

        $service->provision($firstChurch);
        $service->provision($secondChurch);

        self::assertSame(
            ['membros', 'obreiros', 'visitantes'],
            PersonCategory::query()
                ->withoutGlobalScopes()
                ->where('church_id', $firstChurch->id)
                ->orderBy('slug')
                ->pluck('slug')
                ->all(),
        );

        self::assertSame(
            ['membros', 'obreiros', 'visitantes'],
            PersonCategory::query()
                ->withoutGlobalScopes()
                ->where('church_id', $secondChurch->id)
                ->orderBy('slug')
                ->pluck('slug')
                ->all(),
        );
    }

    public function test_authenticated_church_queries_only_return_the_active_tenant_categories(): void
    {
        $firstChurch = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);

        $secondChurch = Church::query()->create([
            'name' => 'Igreja Esperanca',
            'slug' => 'igreja-esperanca',
        ]);

        $service = $this->app->make(ProvisionInitialPersonCategoriesService::class);

        $service->provision($firstChurch);
        $service->provision($secondChurch);

        request()->attributes->set('authenticated_session', [
            'membership' => (object) ['church_id' => $firstChurch->id],
        ]);

        self::assertSame(
            ['membros', 'obreiros', 'visitantes'],
            PersonCategory::query()
                ->orderBy('slug')
                ->pluck('slug')
                ->all(),
        );

        request()->attributes->remove('authenticated_session');
    }

    public function test_queries_fail_closed_without_an_authenticated_church_context(): void
    {
        $church = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);

        $service = $this->app->make(ProvisionInitialPersonCategoriesService::class);

        $service->provision($church);
        request()->attributes->remove('authenticated_session');

        self::assertSame([], PersonCategory::query()->orderBy('slug')->pluck('slug')->all());
    }
}
