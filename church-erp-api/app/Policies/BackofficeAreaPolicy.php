<?php

namespace App\Policies;

use App\Domain\Identity\Services\ResolveBackofficeAreaAccessService;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BackofficeAreaPolicy
{
    public function __construct(
        private readonly ResolveBackofficeAreaAccessService $accessService,
    ) {}

    public function access(User $user, string $area): Response
    {
        $session = request()->attributes->get('authenticated_session');

        if (! is_array($session) || ! isset($session['membership'])) {
            return Response::deny('Sessao invalida. Entre novamente.');
        }

        $membership = $session['membership'];
        $role = (string) ($membership->role ?? '');

        if ($role === '' || ! $this->accessService->canAccess($role, $area)) {
            return Response::deny('Acesso negado para esta area.');
        }

        return Response::allow();
    }
}
