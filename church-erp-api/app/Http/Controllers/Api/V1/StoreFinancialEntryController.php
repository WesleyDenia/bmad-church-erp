<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\CreateFinancialEntryService;
use App\Http\Requests\StoreFinancialEntryRequest;
use App\Http\Resources\FinancialEntryResource;
use Illuminate\Http\JsonResponse;

class StoreFinancialEntryController
{
    public function __invoke(
        StoreFinancialEntryRequest $request,
        CreateFinancialEntryService $service,
    ): JsonResponse {
        return (new FinancialEntryResource($service->create($request->entryPayload())))
            ->response()
            ->setStatusCode(201);
    }
}
