<?php

namespace Tests\Unit\Finance;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Services\ProvisionInitialFinancialCategoriesService;
use App\Domain\Identity\Models\Church;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProvisionInitialFinancialCategoriesServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_provision_is_idempotent_for_the_same_church(): void
    {
        $church = Church::query()->create([
            'name' => 'Igreja Central',
            'slug' => 'igreja-central',
        ]);

        $service = $this->app->make(ProvisionInitialFinancialCategoriesService::class);

        $service->provision($church);
        FinancialCategory::query()
            ->withoutGlobalScopes()
            ->where('church_id', $church->id)
            ->where('slug', 'dizimos')
            ->update(['name' => 'Dizimos livres']);
        FinancialCategory::query()
            ->withoutGlobalScopes()
            ->where('church_id', $church->id)
            ->where('slug', 'ofertas')
            ->delete();
        $service->provision($church);

        self::assertSame(
            4,
            FinancialCategory::query()->withoutGlobalScopes()->where('church_id', $church->id)->count(),
        );
        self::assertSame(
            'Dizimos livres',
            FinancialCategory::query()
                ->withoutGlobalScopes()
                ->where('church_id', $church->id)
                ->where('slug', 'dizimos')
                ->value('name'),
        );
        self::assertSame(
            1,
            FinancialCategory::query()->withoutGlobalScopes()->where('church_id', $church->id)->where('slug', 'ofertas')->count(),
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

        $service = $this->app->make(ProvisionInitialFinancialCategoriesService::class);

        $service->provision($firstChurch);
        $service->provision($secondChurch);

        self::assertSame(
            ['acao-social', 'despesas-operacionais', 'dizimos', 'ofertas'],
            FinancialCategory::query()
                ->withoutGlobalScopes()
                ->where('church_id', $firstChurch->id)
                ->orderBy('slug')
                ->pluck('slug')
                ->all(),
        );

        self::assertSame(
            ['acao-social', 'despesas-operacionais', 'dizimos', 'ofertas'],
            FinancialCategory::query()
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

        $service = $this->app->make(ProvisionInitialFinancialCategoriesService::class);

        $service->provision($firstChurch);
        $service->provision($secondChurch);

        request()->attributes->set('authenticated_session', [
            'membership' => (object) ['church_id' => $firstChurch->id],
        ]);

        self::assertSame(
            ['acao-social', 'despesas-operacionais', 'dizimos', 'ofertas'],
            FinancialCategory::query()
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

        $service = $this->app->make(ProvisionInitialFinancialCategoriesService::class);

        $service->provision($church);
        request()->attributes->remove('authenticated_session');

        self::assertSame([], FinancialCategory::query()->orderBy('slug')->pluck('slug')->all());
    }
}
