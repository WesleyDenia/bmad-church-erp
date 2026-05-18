<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\ListFinancialEntriesService;
use App\Http\Resources\FinancialEntryListResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ListFinancialEntriesController
{
    public function __invoke(
        Request $request,
        ListFinancialEntriesService $service,
    ): JsonResponse {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        Gate::forUser($user)->authorize('access-backoffice-area', 'treasury');

        $churchId = $this->resolveChurchId($request);

        if ($churchId === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        return (new FinancialEntryListResource($service->list($churchId)))
            ->response()
            ->setStatusCode(200);
    }

    private function resolveChurchId(Request $request): ?int
    {
        $session = $request->attributes->get('authenticated_session');
        $membership = is_array($session) ? ($session['membership'] ?? null) : null;
        $churchId = is_object($membership) ? ($membership->church_id ?? null) : null;

        return is_int($churchId) ? $churchId : null;
    }
}
