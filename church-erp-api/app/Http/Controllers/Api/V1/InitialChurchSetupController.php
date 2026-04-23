<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Services\CreateInitialChurchSetupService;
use App\Http\Requests\StoreInitialChurchSetupRequest;
use App\Http\Resources\InitialChurchSetupResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class InitialChurchSetupController
{
    public function __invoke(
        StoreInitialChurchSetupRequest $request,
        CreateInitialChurchSetupService $service,
    ): JsonResponse {
        try {
            $setup = $service->create($request->validated());
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Revise os campos destacados e tente novamente.',
                'errors' => $exception->errors(),
            ], 422);
        }

        return (new InitialChurchSetupResource($setup))
            ->response()
            ->setStatusCode(201);
    }
}
