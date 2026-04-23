<?php

namespace App\Domain\Identity\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

#[Fillable(['church_id', 'user_id', 'role', 'status'])]
class ChurchUser extends Pivot
{
    protected $table = 'church_user';

    public $incrementing = true;

    /**
     * @return BelongsTo<Church, $this>
     */
    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
