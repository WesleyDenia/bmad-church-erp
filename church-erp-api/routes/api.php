<?php

use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\InitialChurchSetupController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthCheckController::class);
    Route::post('/onboarding/initial-setup', InitialChurchSetupController::class);
});
