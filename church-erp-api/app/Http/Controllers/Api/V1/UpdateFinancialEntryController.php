<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Finance\Services\UpdateFinancialEntryService;
use App\Http\Requests\UpdateFinancialEntryRequest;
use App\Http\Resources\FinancialEntryResource;
use Illuminate\Http\JsonResponse;

class UpdateFinancialEntryController
{
    public function __invoke(
        UpdateFinancialEntryRequest $request,
        UpdateFinancialEntryService $service,
    ): JsonResponse {
        $entry = $request->entry();

        abort_if($entry === null, 404);

        return (new FinancialEntryResource(
            $service->update($entry, $request->entryPayload()),
            'Lancamento atualizado com sucesso.',
        ))
            ->response()
            ->setStatusCode(200);
    }
}
