<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogoutController
{
    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Sessao encerrada com sucesso.',
        ]);
    }
}
