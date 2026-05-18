<?php

namespace App\Policies;

use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Identity\Services\ResolveBackofficeAreaAccessService;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class FinancialEntryPolicy
{
    public function __construct(
        private readonly ResolveBackofficeAreaAccessService $accessService,
    ) {}

    public function view(User $user, FinancialEntry $entry): Response
    {
        return $this->authorizeEntry($user, $entry);
    }

    public function update(User $user, FinancialEntry $entry): Response
    {
        return $this->authorizeEntry($user, $entry);
    }

    private function authorizeEntry(User $user, FinancialEntry $entry): Response
    {
        $session = request()->attributes->get('authenticated_session');

        if (! is_array($session) || ! isset($session['membership'])) {
            return Response::deny('Sessao invalida. Entre novamente.');
        }

        $membership = $session['membership'];
        $churchId = is_object($membership) ? ($membership->church_id ?? null) : null;
        $role = is_object($membership) ? (string) ($membership->role ?? '') : '';

        if (! is_int($churchId) || $entry->church_id !== $churchId) {
            return Response::deny('Acesso negado para este lancamento.');
        }

        if ($role === '' || ! $this->accessService->canAccess($role, 'treasury')) {
            return Response::deny('Acesso negado para esta area.');
        }

        return Response::allow();
    }
}
