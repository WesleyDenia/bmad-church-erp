<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\ShowVisitorRequest;
use App\Http\Resources\VisitorResource;
use Illuminate\Http\JsonResponse;

class ShowVisitorController
{
    public function __invoke(ShowVisitorRequest $request): JsonResponse
    {
        return (new VisitorResource($request->visitor()))
            ->response();
    }
}
