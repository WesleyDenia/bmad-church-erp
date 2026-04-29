<?php

namespace App\Http\Middleware;

use App\Domain\Identity\Services\ResolveAuthenticatedSessionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class ResolveInternalSession
{
    public function __construct(
        private readonly ResolveAuthenticatedSessionService $sessionService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! is_string($token) || $token === '') {
            return response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        try {
            $session = $this->sessionService->resolve($token);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['church_id'][0]
                    ?? $exception->errors()['session'][0]
                    ?? 'Sessao invalida. Entre novamente.',
            ], 401);
        }

        $request->attributes->set('authenticated_session', $session);
        $request->setUserResolver(static fn () => $session['user']);
        Auth::setUser($session['user']);

        return $next($request);
    }
}
