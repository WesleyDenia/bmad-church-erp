<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Models\FinancialEntryAudit;

class ListFinancialPendingItemsService
{
    private const RECENT_AUDIT_WINDOW_DAYS = 7;

    /**
     * @return array{financial_pending_items: list<FinancialEntry>}
     */
    public function list(int $churchId): array
    {
        $recentThreshold = now()->subDays(self::RECENT_AUDIT_WINDOW_DAYS);

        $entries = FinancialEntry::query()
            ->forChurch($churchId)
            ->with(['financialCategory', 'counterparty', 'latestAudit.user'])
            ->whereHas('latestAudit', static fn ($query) => $query->where('created_at', '>=', $recentThreshold))
            ->latest('updated_at')
            ->get()
            ->filter(fn (FinancialEntry $entry): bool => $this->changedFieldsCount($entry->latestAudit) > 0)
            ->values()
            ->all();

        return [
            'financial_pending_items' => $entries,
        ];
    }

    private function changedFieldsCount(?FinancialEntryAudit $audit): int
    {
        if ($audit === null) {
            return 0;
        }

        $oldValues = is_array($audit->old_values) ? $audit->old_values : [];
        $newValues = is_array($audit->new_values) ? $audit->new_values : [];
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
