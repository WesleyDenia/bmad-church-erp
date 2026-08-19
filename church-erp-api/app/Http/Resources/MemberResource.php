<?php

namespace App\Http\Resources;

use App\Domain\People\Models\Person;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Person $resource */
        $resource = $this->resource;

        return [
            'member' => [
                'id' => $resource->id,
                'display_name' => $resource->display_name,
                'status' => $resource->status,
                'phone' => $resource->phone,
                'email' => $resource->email,
            ],
        ];
    }
}
