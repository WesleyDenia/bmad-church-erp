<?php

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class ResolveAuthenticatedSessionService
{
    private const REVOKED_SESSION_CACHE_PREFIX = 'identity:revoked-session:';

    /**
     * @return array{
     *   user: User,
     *   membership: ChurchUser,
     *   session_id: string,
     *   permissions_version: int,
     * }
     */
    public function resolve(string $token): array
    {
        $claims = $this->decodeAndValidate($token);

        $this->ensureSessionIsNotRevoked((string) $claims['session_id']);

        $user = User::query()->find($claims['user_id']);
        $church = Church::query()->find($claims['church_id']);

        if (! $user || ! $church) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        $membership = ChurchUser::query()
            ->with('church')
            ->where('user_id', $user->id)
            ->where('church_id', $church->id)
            ->where('status', 'active')
            ->first();

        if (! $membership) {
            throw ValidationException::withMessages([
                'church_id' => ['Nao foi possivel aplicar a igreja correta.'],
            ]);
        }

        return [
            'user' => $user,
            'membership' => $membership,
            'session_id' => (string) $claims['session_id'],
            'permissions_version' => (int) ($claims['permissions_version'] ?? 1),
        ];
    }

    public function revoke(string $token): void
    {
        try {
            $claims = $this->decodeAndValidate($token);
        } catch (ValidationException) {
            return;
        }

        $expiresAt = (int) $claims['exp'];
        $ttlSeconds = $expiresAt - Carbon::now()->timestamp;

        if ($ttlSeconds <= 0) {
            return;
        }

        Cache::put(
            $this->revokedSessionCacheKey((string) $claims['session_id']),
            true,
            $ttlSeconds,
        );
    }

    /**
     * @return array{
     *   user_id: int,
     *   church_id: int,
     *   session_id: string,
     *   permissions_version?: int,
     *   exp: int,
     * }
     */
    private function decodeAndValidate(string $token): array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $header = $this->decodeSegment($encodedHeader);
        $payload = $this->decodeSegment($encodedPayload);

        if (($header['alg'] ?? null) !== 'RS256' || ($header['typ'] ?? null) !== 'JWT') {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        $this->verifySignature($encodedHeader.'.'.$encodedPayload, $encodedSignature);
        $this->verifyRegisteredClaims($payload);

        return $payload;
    }

    private function ensureSessionIsNotRevoked(string $sessionId): void
    {
        if (Cache::has($this->revokedSessionCacheKey($sessionId))) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeSegment(string $segment): array
    {
        $json = base64_decode(strtr($segment, '-_', '+/').str_repeat('=', (4 - strlen($segment) % 4) % 4), true);

        if ($json === false) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        return $decoded;
    }

    private function verifySignature(string $signingInput, string $encodedSignature): void
    {
        $publicKey = config('services.internal_jwt.public_key');

        if (! is_string($publicKey) || $publicKey === '') {
            throw new \RuntimeException('Missing required service config: services.internal_jwt.public_key');
        }

        $signature = base64_decode(strtr($encodedSignature, '-_', '+/').str_repeat('=', (4 - strlen($encodedSignature) % 4) % 4), true);

        if ($signature === false) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        $verified = openssl_verify($signingInput, $signature, $publicKey, OPENSSL_ALGO_SHA256);

        if ($verified !== 1) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function verifyRegisteredClaims(array $payload): void
    {
        $issuer = config('services.internal_jwt.issuer');
        $audience = config('services.internal_jwt.audience');
        $now = Carbon::now()->timestamp;

        if (($payload['iss'] ?? null) !== $issuer || ($payload['aud'] ?? null) !== $audience) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        if (! isset($payload['exp'], $payload['iat']) || ! is_numeric($payload['exp']) || ! is_numeric($payload['iat'])) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }

        if ((int) $payload['exp'] < $now) {
            throw ValidationException::withMessages([
                'session' => ['Sessao expirada. Entre novamente.'],
            ]);
        }

        foreach (['user_id', 'church_id', 'session_id'] as $requiredClaim) {
            if (! isset($payload[$requiredClaim]) || $payload[$requiredClaim] === '') {
                throw ValidationException::withMessages([
                    'session' => ['Sessao invalida. Entre novamente.'],
                ]);
            }
        }

        if ((string) $payload['user_id'] !== (string) $payload['sub']) {
            throw ValidationException::withMessages([
                'session' => ['Sessao invalida. Entre novamente.'],
            ]);
        }
    }

    private function revokedSessionCacheKey(string $sessionId): string
    {
        return self::REVOKED_SESSION_CACHE_PREFIX.$sessionId;
    }
}
