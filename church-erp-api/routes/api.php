<?php

use App\Http\Controllers\Api\V1\BackofficeAreaAccessController;
use App\Http\Controllers\Api\V1\CurrentSessionController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\InitialCategoryDefaultsController;
use App\Http\Controllers\Api\V1\InitialChurchSetupController;
use App\Http\Controllers\Api\V1\ListChurchUsersController;
use App\Http\Controllers\Api\V1\ListFinancialCategoriesController;
use App\Http\Controllers\Api\V1\ListFinancialCounterpartiesController;
use App\Http\Controllers\Api\V1\ListFinancialEntriesController;
use App\Http\Controllers\Api\V1\ListFinancialEntryAuditsController;
use App\Http\Controllers\Api\V1\ListFinancialPendingItemsController;
use App\Http\Controllers\Api\V1\ListPeopleController;
use App\Http\Controllers\Api\V1\LoginController;
use App\Http\Controllers\Api\V1\LogoutController;
use App\Http\Controllers\Api\V1\ShowFinancialClosingSummaryController;
use App\Http\Controllers\Api\V1\ShowLeadershipClosingSummaryController;
use App\Http\Controllers\Api\V1\ShowMemberController;
use App\Http\Controllers\Api\V1\ShowSecretaryHomeController;
use App\Http\Controllers\Api\V1\ShowVisitorController;
use App\Http\Controllers\Api\V1\StoreChurchUserController;
use App\Http\Controllers\Api\V1\StoreFinancialCounterpartyController;
use App\Http\Controllers\Api\V1\StoreFinancialEntryController;
use App\Http\Controllers\Api\V1\StoreMemberController;
use App\Http\Controllers\Api\V1\StoreVisitorController;
use App\Http\Controllers\Api\V1\UpdateChurchUserController;
use App\Http\Controllers\Api\V1\UpdateFinancialEntryController;
use App\Http\Controllers\Api\V1\UpdateMemberController;
use App\Http\Controllers\Api\V1\UpdateVisitorController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthCheckController::class);
    Route::post('/onboarding/initial-setup', InitialChurchSetupController::class);
    Route::post('/auth/login', LoginController::class);
    Route::get('/auth/me', CurrentSessionController::class);
    Route::post('/auth/logout', LogoutController::class);

    Route::middleware('resolve.internal.session')->group(function (): void {
        Route::get('/backoffice/access/{area}', BackofficeAreaAccessController::class);
        Route::get('/categories/defaults', InitialCategoryDefaultsController::class);
        Route::get('/church-users', ListChurchUsersController::class);
        Route::post('/church-users', StoreChurchUserController::class);
        Route::patch('/church-users/{churchUser}', UpdateChurchUserController::class);
        Route::get('/finance/categories', ListFinancialCategoriesController::class);
        Route::get('/finance/counterparties', ListFinancialCounterpartiesController::class);
        Route::post('/finance/counterparties', StoreFinancialCounterpartyController::class);
        Route::get('/finance/entries', ListFinancialEntriesController::class);
        Route::get('/finance/closing-summary', ShowFinancialClosingSummaryController::class);
        Route::get('/leadership/closing-summary', ShowLeadershipClosingSummaryController::class)
            ->middleware('throttle:leadership-closing-summary');
        Route::get('/secretary/home', ShowSecretaryHomeController::class)
            ->name('secretary.home')
            ->middleware('throttle:secretary-home');
        Route::get('/people', ListPeopleController::class)
            ->name('people.index')
            ->middleware('throttle:secretary-people-read');
        Route::post('/people/members', StoreMemberController::class)
            ->name('people.members.store')
            ->middleware('throttle:secretary-members-write');
        Route::get('/people/members/{person}', ShowMemberController::class)
            ->whereNumber('person')
            ->name('people.members.show')
            ->middleware('throttle:secretary-members-read');
        Route::patch('/people/members/{person}', UpdateMemberController::class)
            ->whereNumber('person')
            ->name('people.members.update')
            ->middleware('throttle:secretary-members-write');
        Route::post('/people/visitors', StoreVisitorController::class)
            ->name('people.visitors.store')
            ->middleware('throttle:secretary-visitors-write');
        Route::get('/people/visitors/{person}', ShowVisitorController::class)
            ->whereNumber('person')
            ->name('people.visitors.show')
            ->middleware('throttle:secretary-visitors-read');
        Route::patch('/people/visitors/{person}', UpdateVisitorController::class)
            ->whereNumber('person')
            ->name('people.visitors.update')
            ->middleware('throttle:secretary-visitors-write');
        Route::get('/finance/pending-items', ListFinancialPendingItemsController::class);
        Route::post('/finance/entries', StoreFinancialEntryController::class);
        Route::get('/finance/entries/{entry}/audits', ListFinancialEntryAuditsController::class);
        Route::match(['put', 'patch'], '/finance/entries/{entry}', UpdateFinancialEntryController::class);
    });
});
