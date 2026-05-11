<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\CreateFinancialCounterpartyService;
use App\Http\Requests\StoreFinancialCounterpartyRequest;
use App\Http\Resources\FinancialCounterpartyResource;
use Illuminate\Http\JsonResponse;

class StoreFinancialCounterpartyController
{
    public function __invoke(
        StoreFinancialCounterpartyRequest $request,
        CreateFinancialCounterpartyService $service,
    ): JsonResponse {
        return (new FinancialCounterpartyResource($service->create($request->counterpartyPayload())))
            ->response()
            ->setStatusCode(201);
    }
}
