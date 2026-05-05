<?php

use App\Http\Controllers\Api\V1\BackofficeAreaAccessController;
use App\Http\Controllers\Api\V1\CurrentSessionController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\InitialCategoryDefaultsController;
use App\Http\Controllers\Api\V1\InitialChurchSetupController;
use App\Http\Controllers\Api\V1\LoginController;
use App\Http\Controllers\Api\V1\LogoutController;
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
    });
});
