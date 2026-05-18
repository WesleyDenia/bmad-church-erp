<?php

namespace App\Http\Resources;

use App\Domain\Finance\Models\FinancialEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialEntryListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{financial_entries: list<FinancialEntry>} $resource */
        $resource = $this->resource;

        return [
            'financial_entries' => array_map(
                static fn (FinancialEntry $entry): array => [
                    'id' => $entry->id,
                    'entry_type' => $entry->entry_type,
                    'amount' => $entry->amount,
                    'financial_category_id' => $entry->financial_category_id,
                    'financial_category_name' => $entry->financialCategory?->name,
                    'counterparty_id' => $entry->counterparty_id,
                    'counterparty_name' => $entry->counterparty_name,
                    'cost_center_name' => $entry->cost_center_name,
                    'created_at' => $entry->created_at?->toISOString(),
                    'updated_at' => $entry->updated_at?->toISOString(),
                    'latest_audit' => $entry->latestAudit === null ? null : [
                        'id' => $entry->latestAudit->id,
                        'reason' => $entry->latestAudit->reason,
                        'user_name' => $entry->latestAudit->user?->name,
                        'created_at' => $entry->latestAudit->created_at?->toISOString(),
                    ],
                ],
                $resource['financial_entries'],
            ),
        ];
    }
}
