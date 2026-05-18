<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialEntry;

class ListFinancialEntriesService
{
    /**
     * @return array{financial_entries: list<FinancialEntry>}
     */
    public function list(int $churchId): array
    {
        $entries = FinancialEntry::query()
            ->forChurch($churchId)
            ->with(['financialCategory', 'counterparty', 'latestAudit.user'])
            ->latest('updated_at')
            ->limit(8)
            ->get()
            ->all();

        return [
            'financial_entries' => $entries,
        ];
    }
}
