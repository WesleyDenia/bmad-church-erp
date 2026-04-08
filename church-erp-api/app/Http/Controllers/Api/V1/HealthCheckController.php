<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\HealthCheckResource;
use Illuminate\Http\Request;

class HealthCheckController
{
    public function __invoke(Request $request): HealthCheckResource
    {
        return new HealthCheckResource([
            'status' => 'ok',
            'api_version' => 'v1',
            'tenant_strategy' => 'church_id',
            'requested_at' => now()->toIso8601String(),
            'bff_expected' => true,
        ]);
    }
}
