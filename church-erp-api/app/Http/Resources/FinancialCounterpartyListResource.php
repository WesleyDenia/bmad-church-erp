<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialCounterpartyListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{financial_counterparties: list<array{id: int, name: string, slug: string}>} $resource */
        $resource = $this->resource;

        return [
            'financial_counterparties' => $resource['financial_counterparties'],
        ];
    }
}
