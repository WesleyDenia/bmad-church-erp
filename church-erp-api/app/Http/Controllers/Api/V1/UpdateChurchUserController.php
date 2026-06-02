<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Identity\Models\ChurchUser;
use App\Domain\Identity\Services\UpdateChurchUserMembershipService;
use App\Http\Requests\UpdateChurchUserRequest;
use App\Http\Resources\ChurchUserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Throwable;

class UpdateChurchUserController
{
    public function __invoke(
        UpdateChurchUserRequest $request,
        UpdateChurchUserMembershipService $service,
        string $churchUser,
    ): JsonResponse {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        $churchId = $this->resolveChurchId($request);

        if ($churchId === null) {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        $membership = ChurchUser::query()
            ->with('user')
            ->where('id', (int) $churchUser)
            ->where('church_id', $churchId)
            ->first();

        if ($membership === null) {
            return response()->json([
                'message' => 'Usuario da igreja nao encontrado.',
            ], 404);
        }

        Gate::forUser($user)->authorize('update', $membership);

        try {
            $updatedMembership = $service->update(
                $membership,
                $user->id,
                $churchId,
                $request->membershipPayload(),
            );
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['membership'][0]
                    ?? $exception->errors()['role'][0]
                    ?? $exception->errors()['status'][0]
                    ?? 'Revise os campos obrigatorios e tente novamente.',
                'errors' => $exception->errors(),
            ], 422);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Nao foi possivel atualizar o usuario agora. Tente novamente.',
            ], 500);
        }

        return (new ChurchUserResource([
            'membership' => $updatedMembership,
            'user' => $updatedMembership->user,
            'is_current_user' => $updatedMembership->user_id === $user->id,
            'action' => 'updated',
            'message' => 'Usuario atualizado com sucesso.',
        ]))
            ->response()
            ->setStatusCode(200);
    }

    private function resolveChurchId(UpdateChurchUserRequest $request): ?int
    {
        $session = $request->attributes->get('authenticated_session');
        $membership = is_array($session) ? ($session['membership'] ?? null) : null;
        $churchId = is_object($membership) ? ($membership->church_id ?? null) : null;

        return is_int($churchId) ? $churchId : null;
    }
}
