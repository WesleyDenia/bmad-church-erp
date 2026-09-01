<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class PersonPolicy
{
    public function viewPeople(User $user): Response
    {
        return $this->authorizeSecretaryArea();
    }

    public function createMember(User $user): Response
    {
        return $this->authorizeSecretaryArea();
    }

    public function viewMember(User $user): Response
    {
        return $this->authorizeSecretaryArea();
    }

    public function updateMember(User $user): Response
    {
        return $this->authorizeSecretaryArea();
    }

    public function createVisitor(User $user): Response
    {
        return $this->authorizeSecretaryArea();
    }

    public function viewVisitor(User $user): Response
    {
        return $this->authorizeSecretaryArea();
    }

    public function updateVisitor(User $user): Response
    {
        return $this->authorizeSecretaryArea();
    }

    private function authorizeSecretaryArea(): Response
    {
        $session = request()->attributes->get('authenticated_session');
        $membership = is_array($session) ? ($session['membership'] ?? null) : null;
        $role = is_object($membership) ? (string) ($membership->role ?? '') : '';

        return in_array($role, ['secretary', 'administrator'], true)
            ? Response::allow()
            : Response::deny('Acesso negado para esta area.');
    }
}
