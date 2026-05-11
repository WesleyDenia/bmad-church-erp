<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Models\FinancialEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateFinancialEntryService
{
    /**
     * @param  array{church_id: int, entry_type: string, amount: string, financial_category_id: int, counterparty_id: int, cost_center_name: string}  $payload
     */
    public function create(array $payload): FinancialEntry
    {
        $counterparty = FinancialCounterparty::query()->find($payload['counterparty_id']);

        if ($counterparty === null) {
            throw ValidationException::withMessages([
                'counterparty_id' => 'Escolha uma contraparte valida da igreja atual.',
            ]);
        }

        /** @var FinancialEntry $entry */
        $entry = DB::transaction(
            fn (): FinancialEntry => FinancialEntry::query()->create([
                'church_id' => $payload['church_id'],
                'entry_type' => $payload['entry_type'],
                'amount' => $payload['amount'],
                'financial_category_id' => $payload['financial_category_id'],
                'counterparty_id' => $counterparty->id,
                'counterparty_name' => $counterparty->name,
                'cost_center_name' => $payload['cost_center_name'],
            ])
        );

        return $entry->fresh(['financialCategory', 'counterparty']) ?? $entry;
    }
}
