<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\BuildFinancialClosingSummaryService;
use App\Domain\Finance\Support\ResolveClosingSummaryPeriod;
use App\Http\Requests\ShowLeadershipClosingSummaryRequest;
use App\Http\Resources\FinancialClosingSummaryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ShowLeadershipClosingSummaryController
{
    public function __invoke(
        ShowLeadershipClosingSummaryRequest $request,
        ResolveClosingSummaryPeriod $periodResolver,
        BuildFinancialClosingSummaryService $service,
    ): JsonResponse {
        $period = $request->closingPeriod($periodResolver);
        $summary = $service->build(
            $request->churchId(),
            $period,
            $request->includeDetails(),
        );
        $status = $summary['http_status'] ?? 200;

        if ($request->hasConferencePeriod()) {
            Log::info('leadership_closing_summary_conference_access', [
                'user_id' => $request->user()?->id,
                'church_id' => $request->churchId(),
                'period_start' => $period->periodStart->toISOString(),
                'period_end' => $period->periodEnd->toISOString(),
                'result' => 'allowed',
                'http_status' => $status,
            ]);
        }

        $resource = new FinancialClosingSummaryResource($summary);

        if (isset($summary['message'])) {
            $resource->additional(['message' => $summary['message']]);
        }

        return $resource
            ->response()
            ->setStatusCode($status);
    }
}
