<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\ShowMemberRequest;
use App\Http\Resources\MemberResource;
use Illuminate\Http\JsonResponse;

class ShowMemberController
{
    public function __invoke(ShowMemberRequest $request): JsonResponse
    {
        return (new MemberResource($request->member()))
            ->response();
    }
}
