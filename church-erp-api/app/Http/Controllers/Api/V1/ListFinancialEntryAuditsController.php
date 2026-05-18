<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Finance\Services\ListFinancialEntryAuditsService;
use App\Http\Resources\FinancialEntryAuditListResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ListFinancialEntryAuditsController
{
    public function __invoke(
        Request $request,
        ListFinancialEntryAuditsService $service,
        string $entry,
    ): JsonResponse {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        $financialEntry = FinancialEntry::query()
            ->withoutGlobalScopes()
            ->findOrFail((int) $entry);

        Gate::forUser($user)->authorize('view', $financialEntry);

        return (new FinancialEntryAuditListResource($service->list($financialEntry)))
            ->response()
            ->setStatusCode(200);
    }
}
