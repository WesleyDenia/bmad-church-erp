<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\People\Services\UpdateVisitorService;
use App\Http\Requests\UpdateVisitorRequest;
use App\Http\Resources\VisitorResource;
use Illuminate\Http\JsonResponse;

class UpdateVisitorController
{
    public function __invoke(UpdateVisitorRequest $request, UpdateVisitorService $service): JsonResponse
    {
        return (new VisitorResource($service->update($request->visitor(), $request->visitorPayload())))
            ->additional(['message' => 'Visitante atualizado com sucesso.'])
            ->response();
    }
}
