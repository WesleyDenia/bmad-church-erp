<?php

namespace App\Http\Resources;

use App\Domain\Finance\Models\FinancialEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinancialEntry $resource */
        $resource = $this->resource;

        return [
            'id' => $resource->id,
            'entry_type' => $resource->entry_type,
            'amount' => $resource->amount,
            'financial_category_id' => $resource->financial_category_id,
            'counterparty_id' => $resource->counterparty_id,
            'counterparty_name' => $resource->counterparty_name,
            'cost_center_name' => $resource->cost_center_name,
            'created_at' => $resource->created_at?->toISOString(),
            'message' => 'Lancamento salvo com sucesso.',
        ];
    }
}
