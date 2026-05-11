<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialCategoryListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{financial_categories: list<array{id: int, name: string, slug: string, kind: string}>} $resource */
        $resource = $this->resource;

        return [
            'financial_categories' => $resource['financial_categories'],
        ];
    }
}
