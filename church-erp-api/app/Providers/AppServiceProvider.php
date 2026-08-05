<?php

namespace App\Providers;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Identity\Models\ChurchUser;
use App\Policies\BackofficeAreaPolicy;
use App\Policies\ChurchUserPolicy;
use App\Policies\FinancialEntryPolicy;
use Illuminate\Auth\Access\Response;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
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
        Gate::define('view-leadership-period-summary', function (): Response {
            $session = request()->attributes->get('authenticated_session');
            $membership = is_array($session) ? ($session['membership'] ?? null) : null;
            $role = is_object($membership) ? (string) ($membership->role ?? '') : '';

            return in_array($role, ['leadership', 'administrator'], true)
                ? Response::allow()
                : Response::deny('Acesso negado para esta area.');
        });
        Gate::policy(ChurchUser::class, ChurchUserPolicy::class);
        Gate::policy(FinancialEntry::class, FinancialEntryPolicy::class);

        RateLimiter::for('leadership-closing-summary', function (Request $request): Limit {
            $session = $request->attributes->get('authenticated_session');
            $membership = is_array($session) ? ($session['membership'] ?? null) : null;
            $churchId = is_object($membership) ? ($membership->church_id ?? 'unknown') : 'unknown';
            $userId = $request->user()?->id ?? 'guest';

            return Limit::perMinute(30)->by("{$userId}|{$churchId}");
        });
    }
}
