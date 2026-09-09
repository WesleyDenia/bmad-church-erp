<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunicationTemplateResource extends JsonResource
{
    /**
     * @return array{template_key: string, name: string, short_description: string, category: string, suggested_channel: string, status: string, sort_order: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'template_key' => (string) $this->resource->template_key,
            'name' => (string) $this->resource->name,
            'short_description' => (string) $this->resource->short_description,
            'category' => (string) $this->resource->category,
            'suggested_channel' => (string) $this->resource->suggested_channel,
            'status' => (string) $this->resource->status,
            'sort_order' => (int) $this->resource->sort_order,
        ];
    }
}
