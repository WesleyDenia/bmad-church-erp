<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Services\CreateChurchUserService;
use App\Http\Requests\StoreChurchUserRequest;
use App\Http\Resources\ChurchUserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Throwable;

class StoreChurchUserController
{
    public function __invoke(
        StoreChurchUserRequest $request,
        CreateChurchUserService $service,
    ): JsonResponse {
        try {
            $churchUser = $service->create($request->churchUserPayload());
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['email'][0]
                    ?? $exception->errors()['role'][0]
                    ?? 'Revise os campos obrigatorios e tente novamente.',
                'errors' => $exception->errors(),
            ], 422);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Nao foi possivel cadastrar o usuario agora. Tente novamente.',
            ], 500);
        }

        return (new ChurchUserResource([
            ...$churchUser,
            'action' => 'created',
            'message' => 'Usuario cadastrado com sucesso.',
            'include_church_id' => true,
        ]))
            ->response()
            ->setStatusCode(201);
    }
}
