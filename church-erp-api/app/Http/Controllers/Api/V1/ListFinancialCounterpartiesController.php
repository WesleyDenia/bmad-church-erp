<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\ListFinancialCounterpartiesService;
use App\Http\Resources\FinancialCounterpartyListResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ListFinancialCounterpartiesController
{
    public function __invoke(
        Request $request,
        ListFinancialCounterpartiesService $service,
    ): JsonResponse {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        Gate::forUser($user)->authorize('access-backoffice-area', 'treasury');

        return (new FinancialCounterpartyListResource($service->list()))
            ->response()
            ->setStatusCode(200);
    }
}
