<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Models\FinancialEntryAudit;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateFinancialEntryService
{
    /**
     * @param  array{church_id: int, entry_type: string, amount: string, financial_category_id: int, counterparty_id: int, cost_center_name: string, reason: string, resolve_pending_review: bool, ip_address: string|null}  $payload
     */
    public function update(FinancialEntry $entry, array $payload): FinancialEntry
    {
        $category = FinancialCategory::query()
            ->forChurch($payload['church_id'])
            ->find($payload['financial_category_id']);

        if ($category === null) {
            throw ValidationException::withMessages([
                'financial_category_id' => 'Escolha uma categoria financeira valida da igreja atual.',
            ]);
        }

        $counterparty = FinancialCounterparty::query()
            ->forChurch($payload['church_id'])
            ->find($payload['counterparty_id']);

        if ($counterparty === null) {
            throw ValidationException::withMessages([
                'counterparty_id' => 'Escolha uma contraparte valida da igreja atual.',
            ]);
        }

        /** @var FinancialEntry $updatedEntry */
        $updatedEntry = DB::transaction(function () use ($entry, $payload, $category, $counterparty): FinancialEntry {
            $entry->loadMissing(['financialCategory', 'counterparty']);
            $oldValues = $this->snapshot($entry);

            $entry->forceFill([
                'entry_type' => $payload['entry_type'],
                'amount' => $payload['amount'],
                'financial_category_id' => $category->id,
                'counterparty_id' => $counterparty->id,
                'counterparty_name' => $counterparty->name,
                'cost_center_name' => $payload['cost_center_name'],
            ])->save();

            $entry->setRelation('financialCategory', $category);
            $entry->setRelation('counterparty', $counterparty);
            $newValues = $this->snapshot($entry);
            $changedFieldsCount = $this->changedFieldsCount($oldValues, $newValues);

            FinancialEntryAudit::query()->create([
                'financial_entry_id' => $entry->id,
                'church_id' => $payload['church_id'],
                'user_id' => (int) Auth::id(),
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'reason' => $payload['reason'],
                'ip_address' => $payload['ip_address'],
            ]);

            if ($payload['resolve_pending_review'] && $changedFieldsCount > 0) {
                FinancialEntryAudit::query()->create([
                    'financial_entry_id' => $entry->id,
                    'church_id' => $payload['church_id'],
                    'user_id' => (int) Auth::id(),
                    'old_values' => $newValues,
                    'new_values' => $newValues,
                    'reason' => 'Conferencia final da pendencia apos correcao.',
                    'ip_address' => $payload['ip_address'],
                ]);
            }

            return $entry->fresh(['financialCategory', 'counterparty', 'latestAudit.user']) ?? $entry;
        });

        return $updatedEntry;
    }

    /**
     * @return array<string, int|string|null>
     */
    private function snapshot(FinancialEntry $entry): array
    {
        return [
            'entry_type' => $entry->entry_type,
            'amount' => $entry->amount,
            'financial_category_id' => $entry->financial_category_id,
            'financial_category_name' => $entry->financialCategory?->name,
            'counterparty_id' => $entry->counterparty_id,
            'counterparty_name' => $entry->counterparty_name,
            'cost_center_name' => $entry->cost_center_name,
        ];
    }

    /**
     * @param  array<string, int|string|null>  $oldValues
     * @param  array<string, int|string|null>  $newValues
     */
    private function changedFieldsCount(array $oldValues, array $newValues): int
    {
        $count = 0;

        foreach ($newValues as $field => $newValue) {
            if (($oldValues[$field] ?? null) === $newValue) {
                continue;
            }

            $count++;
        }

        return $count;
    }
}
