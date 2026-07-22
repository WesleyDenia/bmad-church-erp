<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialClosingSummaryResource extends JsonResource
{
    /**
     * @return array{closing_summary: array<string, mixed>}
     */
    public function toArray(Request $request): array
    {
        $closingSummary = [
            'state' => $this->resource['state'],
            'period_kind' => $this->resource['period_kind'],
            'period_start' => $this->resource['period_start']->toISOString(),
            'period_end' => $this->resource['period_end']->toISOString(),
            'total_income' => $this->resource['total_income'],
            'total_expense' => $this->resource['total_expense'],
            'net_result' => $this->resource['net_result'],
            'entry_count' => $this->resource['entry_count'],
            'calculation_basis' => $this->resource['calculation_basis'],
        ];

        if (array_key_exists('details', $this->resource)) {
            $closingSummary['details'] = $this->resource['details'];
        }

        return [
            'closing_summary' => $closingSummary,
        ];
    }
}
