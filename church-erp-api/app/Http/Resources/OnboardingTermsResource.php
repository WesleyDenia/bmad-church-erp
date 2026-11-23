<?php

namespace App\Http\Resources;

use App\Domain\Settings\Models\Term;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnboardingTermsResource extends JsonResource
{
    /**
     * @return array{id: int, version: int, content: string, content_hash: string}
     */
    public function toArray(Request $request): array
    {
        /** @var Term $term */
        $term = $this->resource;

        return [
            'id' => $term->id,
            'version' => $term->version,
            'content' => $term->content,
            'content_hash' => $term->content_hash,
        ];
    }
}
