<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\CreateFinancialEntryService;
use App\Http\Requests\StoreFinancialEntryRequest;
use App\Http\Resources\FinancialEntryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class StoreFinancialEntryController
{
    public function __invoke(
        StoreFinancialEntryRequest $request,
        CreateFinancialEntryService $service,
    ): JsonResponse {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        Gate::forUser($user)->authorize('access-backoffice-area', 'treasury');

        return (new FinancialEntryResource($service->create($request->entryPayload())))
            ->response()
            ->setStatusCode(201);
    }
}
