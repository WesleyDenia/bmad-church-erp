<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Models\FinancialEntryAudit;

class ListFinancialEntryAuditsService
{
    /**
     * @return array{audits: list<FinancialEntryAudit>}
     */
    public function list(FinancialEntry $entry): array
    {
        $audits = FinancialEntryAudit::query()
            ->forChurch($entry->church_id)
            ->where('financial_entry_id', $entry->id)
            ->with('user')
            ->latest()
            ->get()
            ->all();

        return [
            'audits' => $audits,
        ];
    }
}
