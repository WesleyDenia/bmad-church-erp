<?php

namespace App\Providers;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Identity\Models\ChurchUser;
use App\Policies\BackofficeAreaPolicy;
use App\Policies\ChurchUserPolicy;
use App\Policies\FinancialEntryPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('access-backoffice-area', [BackofficeAreaPolicy::class, 'access']);
        Gate::policy(ChurchUser::class, ChurchUserPolicy::class);
        Gate::policy(FinancialEntry::class, FinancialEntryPolicy::class);
    }
}
