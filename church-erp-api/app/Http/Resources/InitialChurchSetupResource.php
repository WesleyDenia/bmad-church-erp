<?php

namespace App\Http\Resources;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InitialChurchSetupResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{church: Church, admin: User, membership: ChurchUser} $resource */
        $resource = $this->resource;

        return [
            'church' => [
                'id' => $resource['church']->id,
                'name' => $resource['church']->name,
                'slug' => $resource['church']->slug,
            ],
            'admin' => [
                'id' => $resource['admin']->id,
                'name' => $resource['admin']->name,
                'email' => $resource['admin']->email,
            ],
            'role' => $resource['membership']->role,
            'message' => 'Configuracao inicial concluida. Agora voce pode entrar no sistema.',
        ];
    }
}
