<?php

namespace App\Domain\Communications\Services;

use App\Domain\Communications\Models\CommunicationTemplate;
use Illuminate\Database\Eloquent\Collection;

class ListCommunicationTemplatesService
{
    /**
     * @return Collection<int, CommunicationTemplate>
     */
    public function list(int $churchId): Collection
    {
        $templates = CommunicationTemplate::query()
            ->select([
                'church_id',
                'template_key',
                'name',
                'short_description',
                'category',
                'suggested_channel',
                'status',
                'sort_order',
            ])
            ->activeBaseOrTenant($churchId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->orderBy('template_key')
            ->orderByRaw('CASE WHEN church_id IS NULL THEN 0 ELSE 1 END')
            ->get();

        return $templates
            ->groupBy('template_key')
            ->map(function (Collection $group) use ($churchId): CommunicationTemplate {
                return $group->firstWhere('church_id', $churchId) ?? $group->first();
            })
            ->filter()
            ->sortBy([
                ['sort_order', 'asc'],
                ['name', 'asc'],
                ['template_key', 'asc'],
            ])
            ->values();
    }
}
