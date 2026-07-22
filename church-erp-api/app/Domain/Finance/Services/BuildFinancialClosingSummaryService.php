<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Support\ClosingSummaryPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

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
     *     calculation_basis: string,
     *     details?: array<string, mixed>,
     *     message?: string,
     *     http_status?: int
     * }
     */
    public function build(int $churchId, ClosingSummaryPeriod $period, bool $includeDetails = false): array
    {
        $query = $this->baseEntriesQuery($churchId, $period);
        $summary = $this->buildSummary($query, $period);

        if (! $includeDetails) {
            return $summary;
        }

        $entries = $this->loadEntriesWithSubtype($query, $churchId);
        $details = $this->buildDetails($entries, $summary);

        if (
            $details['reconciliation']['cost_center_status'] !== 'consistent'
            || $details['reconciliation']['subtype_status'] !== 'consistent'
        ) {
            return [
                ...$summary,
                'state' => 'consistency_error',
                'message' => 'Nao foi possivel confirmar a consistencia do fechamento.',
                'http_status' => 409,
                'details' => [
                    'by_cost_center' => [],
                    'by_subtype' => [],
                    'reconciliation' => $details['reconciliation'],
                ],
            ];
        }

        return [
            ...$summary,
            'details' => $details,
        ];
    }

    /**
     * @return Builder<FinancialEntry>
     */
    private function baseEntriesQuery(int $churchId, ClosingSummaryPeriod $period): Builder
    {
        return FinancialEntry::query()
            ->forChurch($churchId)
            ->where('financial_entries.created_at', '>=', $this->formatPeriodBoundary($period->periodStart))
            ->where('financial_entries.created_at', '<=', $this->formatPeriodBoundary($period->periodEnd));
    }

    /**
     * @param  Builder<FinancialEntry>  $query
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
    private function buildSummary(Builder $query, ClosingSummaryPeriod $period): array
    {
        $entryCount = (int) (clone $query)->count();
        $totals = (clone $query)
            ->selectRaw('entry_type, COALESCE(SUM(amount), 0) as total_amount')
            ->groupBy('entry_type')
            ->pluck('total_amount', 'entry_type');

        $totalIncomeCents = $this->decimalToCents($totals->get('income', '0'));
        $totalExpenseCents = $this->decimalToCents($totals->get('expense', '0'));

        return [
            'state' => $entryCount === 0 ? 'empty_closing_summary' : 'closing_summary_loaded',
            'period_kind' => $period->periodKind,
            'period_start' => $period->periodStart,
            'period_end' => $period->periodEnd,
            'total_income' => $this->formatCents($totalIncomeCents),
            'total_expense' => $this->formatCents($totalExpenseCents),
            'net_result' => $this->formatCents($totalIncomeCents - $totalExpenseCents),
            'entry_count' => $entryCount,
            'calculation_basis' => 'financial_entries.created_at',
        ];
    }

    /**
     * @param  Builder<FinancialEntry>  $query
     * @return Collection<int, object>
     */
    private function loadEntriesWithSubtype(Builder $query, int $churchId): Collection
    {
        return (clone $query)
            ->leftJoin('financial_categories', function ($join) use ($churchId): void {
                $join
                    ->on('financial_categories.id', '=', 'financial_entries.financial_category_id')
                    ->where('financial_categories.church_id', '=', $churchId);
            })
            ->get([
                'financial_entries.entry_type',
                'financial_entries.amount',
                'financial_entries.cost_center_name',
                'financial_entries.financial_category_id',
                'financial_categories.name as financial_category_name',
                'financial_categories.slug as financial_category_slug',
                'financial_categories.kind as financial_category_kind',
            ]);
    }

    /**
     * @param  Collection<int, object>  $entries
     * @param  array<string, mixed>  $summary
     * @return array{by_cost_center: list<array<string, mixed>>, by_subtype: list<array<string, mixed>>, reconciliation: array{cost_center_status: string, subtype_status: string}}
     */
    private function buildDetails(Collection $entries, array $summary): array
    {
        $summaryTotals = [
            'total_income_cents' => $this->decimalToCents($summary['total_income']),
            'total_expense_cents' => $this->decimalToCents($summary['total_expense']),
            'net_result_cents' => $this->decimalToCents($summary['net_result']),
            'entry_count' => (int) $summary['entry_count'],
        ];
        $totalMovementCents = $summaryTotals['total_income_cents'] + $summaryTotals['total_expense_cents'];
        $costCenterGroups = [];
        $subtypeGroups = [];
        $hasMissingSubtype = false;

        foreach ($entries as $entry) {
            $amountCents = $this->decimalToCents($entry->amount);
            $entryType = (string) $entry->entry_type;
            $costCenterName = trim((string) $entry->cost_center_name);

            $costCenterGroups[$costCenterName] ??= $this->emptyGroup([
                'cost_center_name' => $costCenterName,
            ]);
            $this->addAmountToGroup($costCenterGroups[$costCenterName], $entryType, $amountCents);

            if (
                $entry->financial_category_name === null
                || $entry->financial_category_slug === null
                || $entry->financial_category_kind === null
            ) {
                $hasMissingSubtype = true;

                continue;
            }

            $subtypeKey = (string) $entry->financial_category_id;
            $subtypeGroups[$subtypeKey] ??= $this->emptyGroup([
                'financial_category_id' => (int) $entry->financial_category_id,
                'financial_category_name' => (string) $entry->financial_category_name,
                'financial_category_slug' => (string) $entry->financial_category_slug,
                'financial_category_kind' => (string) $entry->financial_category_kind,
            ]);
            $this->addAmountToGroup($subtypeGroups[$subtypeKey], $entryType, $amountCents);
        }

        $byCostCenter = $this->serializeCostCenterRows($costCenterGroups, $totalMovementCents);
        $bySubtype = $this->serializeRows($subtypeGroups, $totalMovementCents, 'financial_category_name');
        $costCenterConsistent = $this->rowsMatchSummary($costCenterGroups, $summaryTotals);
        $subtypeConsistent = ! $hasMissingSubtype && $this->rowsMatchSummary($subtypeGroups, $summaryTotals);

        return [
            'by_cost_center' => $byCostCenter,
            'by_subtype' => $bySubtype,
            'reconciliation' => [
                'cost_center_status' => $costCenterConsistent ? 'consistent' : 'inconsistent',
                'subtype_status' => $subtypeConsistent ? 'consistent' : 'inconsistent',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $identity
     * @return array<string, mixed>
     */
    private function emptyGroup(array $identity): array
    {
        return [
            ...$identity,
            'total_income_cents' => 0,
            'total_expense_cents' => 0,
            'net_result_cents' => 0,
            'entry_count' => 0,
        ];
    }

    /**
     * @param  array<string, mixed>  $group
     */
    private function addAmountToGroup(array &$group, string $entryType, int $amountCents): void
    {
        if ($entryType === 'income') {
            $group['total_income_cents'] += $amountCents;
        }

        if ($entryType === 'expense') {
            $group['total_expense_cents'] += $amountCents;
        }

        $group['net_result_cents'] = $group['total_income_cents'] - $group['total_expense_cents'];
        $group['entry_count']++;
    }

    /**
     * @param  array<string, array<string, mixed>>  $groups
     * @return list<array<string, mixed>>
     */
    private function serializeCostCenterRows(array $groups, int $totalMovementCents): array
    {
        $baseKeyCounts = [];

        foreach ($groups as $group) {
            $baseKey = $this->baseCostCenterKey((string) $group['cost_center_name']);
            $baseKeyCounts[$baseKey] = ($baseKeyCounts[$baseKey] ?? 0) + 1;
        }

        foreach ($groups as &$group) {
            $baseKey = $this->baseCostCenterKey((string) $group['cost_center_name']);
            $group['cost_center_key'] = $baseKeyCounts[$baseKey] > 1
                ? "{$baseKey}-".substr(sha1((string) $group['cost_center_name']), 0, 8)
                : $baseKey;
        }

        return $this->serializeRows($groups, $totalMovementCents, 'cost_center_name');
    }

    /**
     * @param  array<string, array<string, mixed>>  $groups
     * @return list<array<string, mixed>>
     */
    private function serializeRows(array $groups, int $totalMovementCents, string $labelKey): array
    {
        usort($groups, function (array $left, array $right) use ($labelKey): int {
            $leftMovement = $left['total_income_cents'] + $left['total_expense_cents'];
            $rightMovement = $right['total_income_cents'] + $right['total_expense_cents'];

            if ($leftMovement !== $rightMovement) {
                return $rightMovement <=> $leftMovement;
            }

            return strcmp((string) $left[$labelKey], (string) $right[$labelKey]);
        });

        return array_map(fn (array $group): array => $this->serializeRow($group, $totalMovementCents), $groups);
    }

    /**
     * @param  array<string, mixed>  $group
     * @return array<string, mixed>
     */
    private function serializeRow(array $group, int $totalMovementCents): array
    {
        $row = $group;
        $movementCents = $row['total_income_cents'] + $row['total_expense_cents'];

        $row['total_income'] = $this->formatCents($row['total_income_cents']);
        $row['total_expense'] = $this->formatCents($row['total_expense_cents']);
        $row['net_result'] = $this->formatCents($row['net_result_cents']);

        unset($row['total_income_cents'], $row['total_expense_cents'], $row['net_result_cents']);

        if ($totalMovementCents > 0) {
            $row['percentage_of_total_movement'] = $this->formatCents(
                intdiv(($movementCents * 10000) + intdiv($totalMovementCents, 2), $totalMovementCents),
            );
        }

        return $row;
    }

    /**
     * @param  array<string, array<string, mixed>>  $groups
     * @param  array{total_income_cents: int, total_expense_cents: int, net_result_cents: int, entry_count: int}  $summaryTotals
     */
    private function rowsMatchSummary(array $groups, array $summaryTotals): bool
    {
        $actual = [
            'total_income_cents' => 0,
            'total_expense_cents' => 0,
            'net_result_cents' => 0,
            'entry_count' => 0,
        ];

        foreach ($groups as $group) {
            $actual['total_income_cents'] += $group['total_income_cents'];
            $actual['total_expense_cents'] += $group['total_expense_cents'];
            $actual['net_result_cents'] += $group['net_result_cents'];
            $actual['entry_count'] += $group['entry_count'];
        }

        return $actual === $summaryTotals;
    }

    private function decimalToCents(mixed $amount): int
    {
        $value = trim((string) $amount);
        $sign = str_starts_with($value, '-') ? -1 : 1;
        $unsigned = ltrim($value, '+-');
        [$whole, $fraction] = array_pad(explode('.', $unsigned, 2), 2, '0');

        return $sign * (((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0'));
    }

    private function formatCents(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $absolute = abs($cents);

        return $sign.intdiv($absolute, 100).'.'.str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);
    }

    private function baseCostCenterKey(string $costCenterName): string
    {
        $key = Str::slug(Str::ascii(Str::lower(trim($costCenterName))));

        return $key === '' ? 'centro-de-custo' : $key;
    }

    private function formatPeriodBoundary(Carbon $boundary): string
    {
        if ($boundary->microsecond === 0) {
            return $boundary->format('Y-m-d H:i:s');
        }

        return $boundary->format('Y-m-d H:i:s.u');
    }
}
