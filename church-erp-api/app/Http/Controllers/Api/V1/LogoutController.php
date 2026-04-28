<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Services\ResolveAuthenticatedSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogoutController
{
    public function __invoke(
        Request $request,
        ResolveAuthenticatedSessionService $service,
    ): JsonResponse
    {
        $token = $request->bearerToken();

        if (is_string($token) && $token !== '') {
            $service->revoke($token);
        }

        return response()->json([
            'message' => 'Sessao encerrada com sucesso.',
        ]);
    }
}
