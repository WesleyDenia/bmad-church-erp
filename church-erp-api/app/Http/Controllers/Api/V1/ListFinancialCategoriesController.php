<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\ListFinancialCategoriesService;
use App\Http\Resources\FinancialCategoryListResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ListFinancialCategoriesController
{
    public function __invoke(
        Request $request,
        ListFinancialCategoriesService $service,
    ): JsonResponse {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        Gate::forUser($user)->authorize('access-backoffice-area', 'treasury');

        return (new FinancialCategoryListResource($service->list()))
            ->response()
            ->setStatusCode(200);
    }
}
