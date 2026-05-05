<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Services\ListInitialCategoryDefaultsService;
use App\Http\Resources\InitialCategoryDefaultsResource;
use Illuminate\Http\JsonResponse;

class InitialCategoryDefaultsController
{
    public function __invoke(ListInitialCategoryDefaultsService $service): JsonResponse
    {
        return (new InitialCategoryDefaultsResource($service->list()))
            ->response()
            ->setStatusCode(200);
    }
}
