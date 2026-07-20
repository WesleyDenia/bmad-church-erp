<?php

namespace App\Domain\Finance\Support;

use Illuminate\Support\Carbon;

class ResolveClosingSummaryPeriod
{
    public function currentOperationalWeek(): ClosingSummaryPeriod
    {
        $now = Carbon::now('UTC');

        return new ClosingSummaryPeriod(
            $now->copy()->startOfWeek(Carbon::MONDAY)->startOfDay(),
            $now->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay(),
            'current_operational_week',
        );
    }

    public function custom(Carbon $periodStart, Carbon $periodEnd): ClosingSummaryPeriod
    {
        return new ClosingSummaryPeriod(
            $periodStart->copy()->utc(),
            $periodEnd->copy()->utc(),
            'custom_period',
        );
    }
}
