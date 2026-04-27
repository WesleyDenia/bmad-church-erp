<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Services\AuthenticateUserSessionService;
use App\Http\Requests\StoreLoginRequest;
use App\Http\Resources\AuthenticatedSessionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class LoginController
{
    public function __invoke(
        StoreLoginRequest $request,
        AuthenticateUserSessionService $service,
    ): JsonResponse {
        try {
            $session = $service->authenticate($request->validated());
        } catch (ValidationException $exception) {
            $errors = $exception->errors();

            return response()->json([
                'message' => $errors['church_id'][0]
                    ?? $errors['email'][0]
                    ?? 'Nao foi possivel autenticar com essas credenciais.',
                'errors' => $errors,
            ], 422);
        }

        return (new AuthenticatedSessionResource($session))
            ->response()
            ->setStatusCode(200);
    }
}
