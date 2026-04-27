<?php

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ResolveActiveChurchContextService
{
    public function resolveForUser(User $user): ChurchUser
    {
        $memberships = ChurchUser::query()
            ->with('church')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->orderBy('created_at')
            ->get();

        if ($memberships->count() !== 1) {
            throw ValidationException::withMessages([
                'church_id' => ['Nao foi possivel aplicar a igreja correta.'],
            ]);
        }

        return $memberships->firstOrFail();
    }
}
