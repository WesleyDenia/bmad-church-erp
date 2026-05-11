<?php

namespace App\Domain\Finance\Models;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\Concerns\BelongsToAuthenticatedChurch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialCounterparty extends Model
{
    use BelongsToAuthenticatedChurch;

    /**
     * @var list<string>
     */
    protected $fillable = ['church_id', 'name', 'slug'];

    /**
     * @return BelongsTo<Church, $this>
     */
    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}
