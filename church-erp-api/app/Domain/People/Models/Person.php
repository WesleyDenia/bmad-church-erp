<?php

namespace App\Domain\People\Models;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\Concerns\BelongsToAuthenticatedChurch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Person extends Model
{
    use BelongsToAuthenticatedChurch;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'person_type',
        'status',
        'display_name',
        'phone',
        'email',
        'last_contacted_at',
    ];

    protected function casts(): array
    {
        return [
            'last_contacted_at' => 'datetime',
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
     * @param  Builder<Person>  $query
     * @return Builder<Person>
     */
    public function scopeOrderedForCommunication(Builder $query): Builder
    {
        return $query
            ->orderByRaw("CASE status WHEN 'follow_up_needed' THEN 0 WHEN 'new' THEN 1 WHEN 'needs_update' THEN 2 ELSE 9 END")
            ->orderBy('created_at')
            ->orderBy('id');
    }
}
