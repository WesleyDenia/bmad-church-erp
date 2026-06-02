<?php

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\ChurchUser;
use Illuminate\Database\Eloquent\Collection;

class ListChurchUsersService
{
    /**
     * @return Collection<int, ChurchUser>
     */
    public function list(int $churchId): Collection
    {
        /** @var Collection<int, ChurchUser> $memberships */
        $memberships = ChurchUser::query()
            ->with('user')
            ->where('church_id', $churchId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return $memberships;
    }
}
