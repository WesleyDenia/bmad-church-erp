<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Services\ResolveAuthenticatedSessionService;
use App\Http\Resources\AuthenticatedSessionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CurrentSessionController
{
    public function __invoke(
        Request $request,
        ResolveAuthenticatedSessionService $service,
    ): JsonResponse {
        $token = $request->bearerToken();

        if (! is_string($token) || $token === '') {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        try {
            $session = $service->resolve($token);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['church_id'][0]
                    ?? $exception->errors()['session'][0]
                    ?? 'Sessao invalida. Entre novamente.',
                'errors' => $exception->errors(),
            ], 401);
        }

        return (new AuthenticatedSessionResource($session))
            ->response()
            ->setStatusCode(200);
    }
}
