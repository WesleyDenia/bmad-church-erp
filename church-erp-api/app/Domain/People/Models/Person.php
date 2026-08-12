<?php

namespace App\Domain\People\Models;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\Concerns\BelongsToAuthenticatedChurch;
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
}
