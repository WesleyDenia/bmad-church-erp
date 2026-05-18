<?php

namespace App\Http\Resources;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Models\FinancialEntryAudit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialPendingItemListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{financial_pending_items: list<FinancialEntry>} $resource */
        $resource = $this->resource;

        return [
            'financial_pending_items' => array_map(
                fn (FinancialEntry $entry): array => $this->mapPendingItem($entry),
                $resource['financial_pending_items'],
            ),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPendingItem(FinancialEntry $entry): array
    {
        $latestAudit = $entry->latestAudit;
        $changedFields = $this->changedFields($latestAudit);
        $changedFieldsCount = count($changedFields);
        $categoryName = $entry->financialCategory?->name ?? 'Sem subtipo';
        $fieldLabel = $changedFieldsCount === 1 ? 'campo alterado' : 'campos alterados';

        return [
            'id' => "recent-audit-review-{$entry->id}",
            'entry_id' => $entry->id,
            'pending_type' => 'recent_audit_review',
            'pending_type_label' => 'Revisao de alteracao recente',
            'count' => $changedFieldsCount,
            'label' => $entry->counterparty_name,
            'context' => "{$changedFieldsCount} {$fieldLabel} em {$categoryName}. Motivo: {$latestAudit?->reason}",
            'cta_label' => 'Revisar lancamento',
            'resolution_action' => 'edit_entry',
            'financial_entry' => $this->mapFinancialEntry($entry),
            'latest_audit' => $latestAudit === null ? null : [
                'id' => $latestAudit->id,
                'reason' => $latestAudit->reason,
                'user_name' => $latestAudit->user?->name,
                'created_at' => $latestAudit->created_at?->toISOString(),
                'changed_fields' => $changedFields,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapFinancialEntry(FinancialEntry $entry): array
    {
        return [
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
        ];
    }

    /**
     * @return list<array{field: string, old_value: mixed, new_value: mixed}>
     */
    private function changedFields(?FinancialEntryAudit $audit): array
    {
        if ($audit === null) {
            return [];
        }

        $oldValues = is_array($audit->old_values) ? $audit->old_values : [];
        $newValues = is_array($audit->new_values) ? $audit->new_values : [];
        $fields = [];

        foreach ($newValues as $field => $newValue) {
            $oldValue = $oldValues[$field] ?? null;

            if ($oldValue === $newValue) {
                continue;
            }

            $fields[] = [
                'field' => $field,
                'old_value' => $oldValue,
                'new_value' => $newValue,
            ];
        }

        return $fields;
    }
}
