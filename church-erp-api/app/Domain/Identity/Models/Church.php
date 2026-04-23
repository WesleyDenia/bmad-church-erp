<?php

namespace App\Domain\Identity\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Church extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = ['name', 'slug'];

    /**
     * @return HasMany<ChurchUser, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(ChurchUser::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->using(ChurchUser::class)
            ->withPivot(['role', 'status'])
            ->withTimestamps();
    }
}
