<?php

namespace App\Domain\Finance\Models;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\Concerns\BelongsToAuthenticatedChurch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialEntry extends Model
{
    use BelongsToAuthenticatedChurch;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'church_id',
        'entry_type',
        'amount',
        'financial_category_id',
        'counterparty_id',
        'counterparty_name',
        'cost_center_name',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
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
     * @return BelongsTo<FinancialCategory, $this>
     */
    public function financialCategory(): BelongsTo
    {
        return $this->belongsTo(FinancialCategory::class);
    }

    /**
     * @return BelongsTo<FinancialCounterparty, $this>
     */
    public function counterparty(): BelongsTo
    {
        return $this->belongsTo(FinancialCounterparty::class, 'counterparty_id');
    }
}
