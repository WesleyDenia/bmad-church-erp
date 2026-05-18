<?php

namespace App\Http\Resources;

use App\Domain\Finance\Models\FinancialEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialEntryResource extends JsonResource
{
    public function __construct($resource, private readonly string $message = 'Lancamento salvo com sucesso.')
    {
        parent::__construct($resource);
    }

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
            'financial_category_name' => $resource->financialCategory?->name,
            'counterparty_id' => $resource->counterparty_id,
            'counterparty_name' => $resource->counterparty_name,
            'cost_center_name' => $resource->cost_center_name,
            'created_at' => $resource->created_at?->toISOString(),
            'updated_at' => $resource->updated_at?->toISOString(),
            'latest_audit' => $resource->latestAudit === null ? null : [
                'id' => $resource->latestAudit->id,
                'reason' => $resource->latestAudit->reason,
                'user_name' => $resource->latestAudit->user?->name,
                'created_at' => $resource->latestAudit->created_at?->toISOString(),
            ],
            'message' => $this->message,
        ];
    }
}
