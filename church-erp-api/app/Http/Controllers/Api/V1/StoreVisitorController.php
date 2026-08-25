<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\People\Services\CreateVisitorService;
use App\Http\Requests\StoreVisitorRequest;
use App\Http\Resources\VisitorResource;
use Illuminate\Http\JsonResponse;

class StoreVisitorController
{
    public function __invoke(StoreVisitorRequest $request, CreateVisitorService $service): JsonResponse
    {
        return (new VisitorResource($service->create($request->visitorPayload())))
            ->additional(['message' => 'Visitante cadastrado com sucesso.'])
            ->response()
            ->setStatusCode(201);
    }
}
