<?php

namespace App\Domain\Finance\Support;

use Illuminate\Support\Carbon;

class ClosingSummaryPeriod
{
    public function __construct(
        public readonly Carbon $periodStart,
        public readonly Carbon $periodEnd,
        public readonly string $periodKind,
    ) {}
}
