<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialCounterparty;

class ListFinancialCounterpartiesService
{
    /**
     * @return array{financial_counterparties: list<array{id: int, name: string, slug: string}>}
     */
    public function list(int $churchId): array
    {
        return [
            'financial_counterparties' => FinancialCounterparty::query()
                ->forChurch($churchId)
                ->orderBy('slug')
                ->get()
                ->map(fn (FinancialCounterparty $counterparty): array => [
                    'id' => $counterparty->id,
                    'name' => $counterparty->name,
                    'slug' => $counterparty->slug,
                ])
                ->values()
                ->all(),
        ];
    }
}
