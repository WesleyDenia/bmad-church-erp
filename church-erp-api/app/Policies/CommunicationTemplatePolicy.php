<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class CommunicationTemplatePolicy
{
    public function viewCommunicationTemplates(User $user): Response
    {
        $session = request()->attributes->get('authenticated_session');
        $membership = is_array($session) ? ($session['membership'] ?? null) : null;
        $role = is_object($membership) ? (string) ($membership->role ?? '') : '';

        return in_array($role, ['secretary', 'administrator'], true)
            ? Response::allow()
            : Response::deny('Acesso negado para esta area.');
    }
}
