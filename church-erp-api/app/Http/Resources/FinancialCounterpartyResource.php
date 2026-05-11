<?php

namespace App\Http\Resources;

use App\Domain\Finance\Models\FinancialCounterparty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialCounterpartyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinancialCounterparty $resource */
        $resource = $this->resource;

        return [
            'id' => $resource->id,
            'name' => $resource->name,
            'slug' => $resource->slug,
            'message' => 'Contraparte cadastrada com sucesso.',
        ];
    }
}
