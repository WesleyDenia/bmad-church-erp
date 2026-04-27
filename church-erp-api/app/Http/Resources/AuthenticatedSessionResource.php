<?php

namespace App\Http\Resources;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticatedSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{user: User, membership: ChurchUser, session_id?: string, permissions_version?: int} $resource */
        $resource = $this->resource;

        /** @var Church $church */
        $church = $resource['membership']->church;

        $payload = [
            'user' => [
                'id' => $resource['user']->id,
                'name' => $resource['user']->name,
                'email' => $resource['user']->email,
            ],
            'church' => [
                'id' => $church->id,
                'name' => $church->name,
                'slug' => $church->slug,
            ],
            'roles' => [$resource['membership']->role],
            'role' => $resource['membership']->role,
            'permissions_version' => $resource['permissions_version'] ?? 1,
            'message' => 'Sessao autenticada com sucesso.',
        ];

        if (isset($resource['session_id'])) {
            $payload['session_id'] = $resource['session_id'];
        }

        return $payload;
    }
}
