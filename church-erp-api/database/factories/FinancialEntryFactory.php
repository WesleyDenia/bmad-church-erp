<?php

namespace Database\Factories;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Identity\Models\Church;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinancialEntry>
 */
class FinancialEntryFactory extends Factory
{
    protected $model = FinancialEntry::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'entry_type' => 'expense',
            'amount' => fake()->randomFloat(2, 25, 2500),
            'counterparty_name' => fake()->company(),
            'cost_center_name' => fake()->randomElement([
                'Administracao',
                'Cultos',
                'Acao social',
                'Missoes',
                'Ensino',
            ]),
        ];
    }

    public function forChurch(
        Church $church,
        FinancialCategory $category,
        FinancialCounterparty $counterparty,
    ): static {
        return $this->state(fn (): array => [
            'church_id' => $church->id,
            'entry_type' => $category->kind,
            'financial_category_id' => $category->id,
            'counterparty_id' => $counterparty->id,
            'counterparty_name' => $counterparty->name,
        ]);
    }
}
