<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\BuildFinancialClosingSummaryService;
use App\Domain\Finance\Support\ResolveClosingSummaryPeriod;
use App\Http\Requests\ShowFinancialClosingSummaryRequest;
use App\Http\Resources\FinancialClosingSummaryResource;
use Illuminate\Http\JsonResponse;

class ShowFinancialClosingSummaryController
{
    public function __invoke(
        ShowFinancialClosingSummaryRequest $request,
        ResolveClosingSummaryPeriod $periodResolver,
        BuildFinancialClosingSummaryService $service,
    ): JsonResponse {
        $summary = $service->build(
            $request->churchId(),
            $request->closingPeriod($periodResolver),
            $request->includeDetails(),
        );
        $status = $summary['http_status'] ?? 200;
        $resource = new FinancialClosingSummaryResource($summary);

        if (isset($summary['message'])) {
            $resource->additional(['message' => $summary['message']]);
        }

        return $resource
            ->response()
            ->setStatusCode($status);
    }
}
