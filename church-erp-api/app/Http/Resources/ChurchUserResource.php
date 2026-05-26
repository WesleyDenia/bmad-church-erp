<?php

namespace App\Http\Resources;

use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChurchUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{user: User, membership: ChurchUser} $resource */
        $resource = $this->resource;

        return [
            'user' => [
                'id' => $resource['user']->id,
                'name' => $resource['user']->name,
                'email' => $resource['user']->email,
            ],
            'membership' => [
                'church_id' => $resource['membership']->church_id,
                'role' => $resource['membership']->role,
                'status' => $resource['membership']->status,
            ],
            'action' => 'created',
            'message' => 'Usuario cadastrado com sucesso.',
        ];
    }
}
