<?php

namespace App\Domain\Settings\Models;

use App\Domain\Settings\Exceptions\TermIsImmutable;
use Illuminate\Database\Eloquent\Model;

class Term extends Model
{
    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'version',
        'content',
        'content_hash',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new TermIsImmutable('Um termo publicado nao pode ser alterado.');
        });

        static::deleting(function (): never {
            throw new TermIsImmutable('Um termo publicado nao pode ser excluido.');
        });
    }
}
