<?php

namespace App\Policies;

use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ChurchUserPolicy
{
    public function viewAny(User $user): Response
    {
        return $this->administratorOnlyResponse();
    }

    public function create(User $user): Response
    {
        return $this->administratorOnlyResponse();
    }

    public function update(User $user, ChurchUser $churchUser): Response
    {
        return $this->administratorOnlyResponse();
    }

    private function administratorOnlyResponse(): Response
    {
        $session = request()->attributes->get('authenticated_session');

        if (! is_array($session) || ! isset($session['membership'])) {
            return Response::deny('Sessao invalida. Entre novamente.');
        }

        $membership = $session['membership'];
        $role = is_object($membership) ? (string) ($membership->role ?? '') : '';

        if ($role !== 'administrator') {
            return Response::deny('Acesso negado para esta area.');
        }

        return Response::allow();
    }
}
