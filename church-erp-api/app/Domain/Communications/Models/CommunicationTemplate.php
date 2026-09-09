<?php

namespace App\Domain\Communications\Models;

use App\Domain\Identity\Models\Church;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunicationTemplate extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'church_id',
        'template_key',
        'name',
        'short_description',
        'body_template',
        'category',
        'suggested_channel',
        'status',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'church_id' => 'integer',
            'church_scope_id' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Church, $this>
     */
    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    /**
     * @param  Builder<CommunicationTemplate>  $query
     * @return Builder<CommunicationTemplate>
     */
    public function scopeActiveBaseOrTenant(Builder $query, int $churchId): Builder
    {
        return $query
            ->where('status', 'active')
            ->where(function (Builder $scopeQuery) use ($churchId): void {
                $scopeQuery
                    ->whereNull('church_id')
                    ->orWhere('church_id', $churchId);
            });
    }

    /**
     * @param  Builder<CommunicationTemplate>  $query
     * @return Builder<CommunicationTemplate>
     */
    public function scopeForTenant(Builder $query, int $churchId): Builder
    {
        return $query->where('church_id', $churchId);
    }
}
