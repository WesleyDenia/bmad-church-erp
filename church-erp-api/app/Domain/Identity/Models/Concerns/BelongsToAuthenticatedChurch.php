<?php

namespace App\Domain\Identity\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToAuthenticatedChurch
{
    protected static function bootBelongsToAuthenticatedChurch(): void
    {
        static::addGlobalScope('authenticated_church', function (Builder $builder): void {
            $churchId = static::resolveAuthenticatedChurchId();

            if ($churchId === null) {
                $builder->whereRaw('1 = 0');

                return;
            }

            $builder->where($builder->qualifyColumn('church_id'), $churchId);
        });
    }

    public function scopeForChurch(Builder $query, int $churchId): Builder
    {
        return $query
            ->withoutGlobalScope('authenticated_church')
            ->where($query->qualifyColumn('church_id'), $churchId);
    }

    protected static function resolveAuthenticatedChurchId(): ?int
    {
        $session = request()->attributes->get('authenticated_session');

        if (! is_array($session)) {
            return null;
        }

        $membership = $session['membership'] ?? null;

        if (is_object($membership) && isset($membership->church_id)) {
            return (int) $membership->church_id;
        }

        if (is_array($membership) && isset($membership['church_id'])) {
            return (int) $membership['church_id'];
        }

        return null;
    }
}
