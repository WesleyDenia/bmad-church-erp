<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\People\Services\CreateMemberService;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Resources\MemberResource;
use Illuminate\Http\JsonResponse;

class StoreMemberController
{
    public function __invoke(StoreMemberRequest $request, CreateMemberService $service): JsonResponse
    {
        return (new MemberResource($service->create($request->memberPayload())))
            ->additional(['message' => 'Membro cadastrado com sucesso.'])
            ->response()
            ->setStatusCode(201);
    }
}
