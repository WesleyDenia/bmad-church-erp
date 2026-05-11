<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialEntry;
use Illuminate\Support\Facades\DB;

class CreateFinancialEntryService
{
    /**
     * @param  array{church_id: int, entry_type: string, amount: string, financial_category_id: int, counterparty_name: string, cost_center_name: string}  $payload
     */
    public function create(array $payload): FinancialEntry
    {
        /** @var FinancialEntry $entry */
        $entry = DB::transaction(
            fn (): FinancialEntry => FinancialEntry::query()->create($payload)
        );

        return $entry->fresh(['financialCategory']) ?? $entry;
    }
}
