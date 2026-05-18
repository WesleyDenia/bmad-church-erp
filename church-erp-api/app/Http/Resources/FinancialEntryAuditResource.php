<?php

namespace App\Http\Resources;

use App\Domain\Finance\Models\FinancialEntryAudit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialEntryAuditResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinancialEntryAudit $resource */
        $resource = $this->resource;

        return [
            'id' => $resource->id,
            'reason' => $resource->reason,
            'user_id' => $resource->user_id,
            'user_name' => $resource->user?->name,
            'ip_address' => $resource->ip_address,
            'old_values' => $resource->old_values,
            'new_values' => $resource->new_values,
            'changed_fields' => $this->changedFields($resource),
            'created_at' => $resource->created_at?->toISOString(),
        ];
    }

    /**
     * @return list<array{field: string, old_value: mixed, new_value: mixed}>
     */
    private function changedFields(FinancialEntryAudit $audit): array
    {
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
