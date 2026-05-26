<?php

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateChurchUserService
{
    /**
     * @var list<string>
     */
    public const ALLOWED_ROLES = ['treasurer', 'secretary', 'leadership'];

    /**
     * @param  array{church_id: int, name: string, email: string, password: string, role: string}  $payload
     * @return array{user: User, membership: ChurchUser}
     */
    public function create(array $payload): array
    {
        $existingUser = User::query()
            ->where('email', $payload['email'])
            ->first();

        if ($existingUser !== null) {
            $existingMembership = ChurchUser::query()
                ->where('user_id', $existingUser->id)
                ->where('church_id', $payload['church_id'])
                ->first();

            if ($existingMembership !== null) {
                throw ValidationException::withMessages([
                    'email' => ['Este usuario ja esta associado a esta igreja.'],
                ]);
            }

            throw ValidationException::withMessages([
                'email' => ['Este email ja pertence a outra igreja. O reaproveitamento ainda nao esta disponivel.'],
            ]);
        }

        /** @var array{user: User, membership: ChurchUser} $created */
        $created = DB::transaction(function () use ($payload): array {
            $user = User::query()->create([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'password' => $payload['password'],
            ]);

            $membership = ChurchUser::query()->create([
                'church_id' => $payload['church_id'],
                'user_id' => $user->id,
                'role' => $payload['role'],
                'status' => 'active',
            ]);

            return [
                'user' => $user,
                'membership' => $membership,
            ];
        });

        return $created;
    }
}
