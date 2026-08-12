<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\People\Services\BuildSecretaryHomeService;
use App\Http\Requests\ShowSecretaryHomeRequest;
use App\Http\Resources\SecretaryHomeResource;
use Illuminate\Http\JsonResponse;

class ShowSecretaryHomeController
{
    public function __invoke(ShowSecretaryHomeRequest $request, BuildSecretaryHomeService $service): JsonResponse
    {
        return (new SecretaryHomeResource($service->build($request->churchId())))
            ->response();
    }
}
