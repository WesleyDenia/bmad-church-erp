<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthCheckResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'status' => $this->resource['status'],
            'api_version' => $this->resource['api_version'],
            'tenant_strategy' => $this->resource['tenant_strategy'],
            'requested_at' => $this->resource['requested_at'],
            'bff_expected' => $this->resource['bff_expected'],
        ];
    }
}
