<?php

namespace App\Http\Resources;

use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use RuntimeException;

class ChurchUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        [$membership, $user, $meta] = $this->resolveResource($request);

        $payload = [
            'membership_id' => $membership->id,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'membership' => [
                'role' => $membership->role,
                'status' => $membership->status,
            ],
            'is_current_user' => $meta['is_current_user'],
        ];

        if ($meta['include_church_id']) {
            $payload['membership']['church_id'] = $membership->church_id;
        }

        if ($meta['action'] !== null) {
            $payload['action'] = $meta['action'];
        }

        if ($meta['message'] !== null) {
            $payload['message'] = $meta['message'];
        }

        return $payload;
    }

    /**
     * @return array{
     *   0: ChurchUser,
     *   1: User,
     *   2: array{
     *     is_current_user: bool,
     *     action: ?string,
     *     message: ?string,
     *     include_church_id: bool
     *   }
     * }
     */
    private function resolveResource(Request $request): array
    {
        if ($this->resource instanceof ChurchUser) {
            /** @var User $user */
            $user = $this->resource->relationLoaded('user')
                ? $this->resource->getRelation('user')
                : $this->resource->user()->firstOrFail();

            return [
                $this->resource,
                $user,
                [
                    'is_current_user' => $request->user()?->id === $this->resource->user_id,
                    'action' => null,
                    'message' => null,
                    'include_church_id' => false,
                ],
            ];
        }

        if (! is_array($this->resource) || ! isset($this->resource['membership'])) {
            throw new RuntimeException('ChurchUserResource expects a ChurchUser model or a payload with membership data.');
        }

        /** @var ChurchUser $membership */
        $membership = $this->resource['membership'];
        /** @var User $user */
        $user = $this->resource['user'] ?? $membership->user()->firstOrFail();

        return [
            $membership,
            $user,
            [
                'is_current_user' => (bool) ($this->resource['is_current_user'] ?? ($request->user()?->id === $membership->user_id)),
                'action' => isset($this->resource['action']) ? (string) $this->resource['action'] : null,
                'message' => isset($this->resource['message']) ? (string) $this->resource['message'] : null,
                'include_church_id' => (bool) ($this->resource['include_church_id'] ?? false),
            ],
        ];
    }
}
