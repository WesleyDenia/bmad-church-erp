<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Support\FinancialCounterpartyNameNormalizer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateFinancialCounterpartyService
{
    /**
     * @param  array{church_id: int, name: string}  $payload
     */
    public function create(array $payload): FinancialCounterparty
    {
        $name = FinancialCounterpartyNameNormalizer::displayName($payload['name']);
        $slug = FinancialCounterpartyNameNormalizer::slug($name);

        if (
            FinancialCounterparty::query()
                ->where('slug', $slug)
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'name' => 'Ja existe uma contraparte com esse nome nesta igreja.',
            ]);
        }

        /** @var FinancialCounterparty $counterparty */
        $counterparty = DB::transaction(
            fn (): FinancialCounterparty => FinancialCounterparty::query()->create([
                'church_id' => $payload['church_id'],
                'name' => $name,
                'slug' => $slug,
            ])
        );

        return $counterparty;
    }
}
