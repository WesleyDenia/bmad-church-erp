<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class ChurchUserPolicy
{
    public function create(User $user): Response
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
