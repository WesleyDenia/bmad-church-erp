<?php

namespace App\Domain\Identity\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthenticateUserSessionService
{
    public function __construct(
        private readonly ResolveActiveChurchContextService $resolveActiveChurchContextService,
    ) {
    }

    /**
     * @param  array{email: string, password: string}  $payload
     * @return array{
     *   user: User,
     *   membership: \App\Domain\Identity\Models\ChurchUser
     * }
     */
    public function authenticate(array $payload): array
    {
        $user = User::query()
            ->where('email', $payload['email'])
            ->first();

        if (! $user || ! Hash::check($payload['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais invalidas.'],
            ]);
        }

        $membership = $this->resolveActiveChurchContextService->resolveForUser($user);

        return [
            'user' => $user,
            'membership' => $membership,
        ];
    }
}
