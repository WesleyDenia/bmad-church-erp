<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Support\ClosingSummaryPeriod;
use Illuminate\Support\Carbon;

class BuildFinancialClosingSummaryService
{
    /**
     * @return array{
     *     state: string,
     *     period_kind: string,
     *     period_start: Carbon,
     *     period_end: Carbon,
     *     total_income: string,
     *     total_expense: string,
     *     net_result: string,
     *     entry_count: int,
     *     calculation_basis: string
     * }
     */
    public function build(int $churchId, ClosingSummaryPeriod $period): array
    {
        $query = FinancialEntry::query()
            ->forChurch($churchId)
            ->where('created_at', '>=', $this->formatPeriodBoundary($period->periodStart))
            ->where('created_at', '<=', $this->formatPeriodBoundary($period->periodEnd));

        $entryCount = (int) (clone $query)->count();
        $totals = (clone $query)
            ->selectRaw('entry_type, COALESCE(SUM(amount), 0) as total_amount')
            ->groupBy('entry_type')
            ->pluck('total_amount', 'entry_type');

        $totalIncome = $this->formatAmount($totals->get('income', '0'));
        $totalExpense = $this->formatAmount($totals->get('expense', '0'));
        $netResult = $this->formatAmount((float) $totalIncome - (float) $totalExpense);

        return [
            'state' => $entryCount === 0 ? 'empty_closing_summary' : 'closing_summary_loaded',
            'period_kind' => $period->periodKind,
            'period_start' => $period->periodStart,
            'period_end' => $period->periodEnd,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'net_result' => $netResult,
            'entry_count' => $entryCount,
            'calculation_basis' => 'financial_entries.created_at',
        ];
    }

    private function formatAmount(mixed $amount): string
    {
        return number_format((float) $amount, 2, '.', '');
    }

    private function formatPeriodBoundary(Carbon $boundary): string
    {
        if ($boundary->microsecond === 0) {
            return $boundary->format('Y-m-d H:i:s');
        }

        return $boundary->format('Y-m-d H:i:s.u');
    }
}
