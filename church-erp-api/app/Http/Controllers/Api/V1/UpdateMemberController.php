<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\People\Services\UpdateMemberService;
use App\Http\Requests\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use Illuminate\Http\JsonResponse;

class UpdateMemberController
{
    public function __invoke(UpdateMemberRequest $request, UpdateMemberService $service): JsonResponse
    {
        return (new MemberResource($service->update($request->member(), $request->memberPayload())))
            ->additional(['message' => 'Membro atualizado com sucesso.'])
            ->response();
    }
}
