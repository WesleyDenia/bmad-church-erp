<?php

namespace App\Domain\Finance\Models;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\Concerns\BelongsToAuthenticatedChurch;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialEntryAudit extends Model
{
    use BelongsToAuthenticatedChurch;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'financial_entry_id',
        'user_id',
        'church_id',
        'old_values',
        'new_values',
        'reason',
        'ip_address',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
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
     * @return BelongsTo<FinancialEntry, $this>
     */
    public function financialEntry(): BelongsTo
    {
        return $this->belongsTo(FinancialEntry::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
