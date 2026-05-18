<?php

use App\Http\Controllers\Api\V1\BackofficeAreaAccessController;
use App\Http\Controllers\Api\V1\CurrentSessionController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\InitialCategoryDefaultsController;
use App\Http\Controllers\Api\V1\InitialChurchSetupController;
use App\Http\Controllers\Api\V1\ListFinancialCategoriesController;
use App\Http\Controllers\Api\V1\ListFinancialCounterpartiesController;
use App\Http\Controllers\Api\V1\ListFinancialEntriesController;
use App\Http\Controllers\Api\V1\ListFinancialEntryAuditsController;
use App\Http\Controllers\Api\V1\LoginController;
use App\Http\Controllers\Api\V1\LogoutController;
use App\Http\Controllers\Api\V1\StoreFinancialCounterpartyController;
use App\Http\Controllers\Api\V1\StoreFinancialEntryController;
use App\Http\Controllers\Api\V1\UpdateFinancialEntryController;
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
        Route::get('/finance/categories', ListFinancialCategoriesController::class);
        Route::get('/finance/counterparties', ListFinancialCounterpartiesController::class);
        Route::post('/finance/counterparties', StoreFinancialCounterpartyController::class);
        Route::get('/finance/entries', ListFinancialEntriesController::class);
        Route::post('/finance/entries', StoreFinancialEntryController::class);
        Route::get('/finance/entries/{entry}/audits', ListFinancialEntryAuditsController::class);
        Route::match(['put', 'patch'], '/finance/entries/{entry}', UpdateFinancialEntryController::class);
    });
});
