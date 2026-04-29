<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class BackofficeAreaAccessController
{
    public function __invoke(Request $request, string $area): JsonResponse
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        Gate::forUser($user)->authorize('access-backoffice-area', $area);

        return response()->json([
            'message' => 'Acesso liberado.',
        ]);
    }
}
