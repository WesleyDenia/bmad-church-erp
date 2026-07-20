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
        return (new FinancialClosingSummaryResource(
            $service->build(
                $request->churchId(),
                $request->closingPeriod($periodResolver),
            ),
        ))
            ->response()
            ->setStatusCode(200);
    }
}
