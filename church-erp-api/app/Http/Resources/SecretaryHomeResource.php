<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SecretaryHomeResource extends JsonResource
{
    /**
     * @return array{secretary_home: array<string, mixed>}
     */
    public function toArray(Request $request): array
    {
        return [
            'secretary_home' => [
                'state' => $this->resource['state'],
                'people_pending_items' => $this->resource['people_pending_items'],
                'recent_visitors' => $this->resource['recent_visitors'],
                'quick_actions' => $this->resource['quick_actions'],
                'event_schedule' => $this->resource['event_schedule'],
                'communication_pending' => $this->resource['communication_pending'],
                'weekly_checklist' => $this->resource['weekly_checklist'],
            ],
        ];
    }
}
