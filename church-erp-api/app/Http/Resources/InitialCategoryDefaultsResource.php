<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InitialCategoryDefaultsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{
         *   financial_categories: list<array{id: int, name: string, slug: string, kind: string}>,
         *   person_categories: list<array{id: int, name: string, slug: string}>
         * } $resource
         */
        $resource = $this->resource;

        return [
            'financial_categories' => $resource['financial_categories'],
            'person_categories' => $resource['person_categories'],
        ];
    }
}
