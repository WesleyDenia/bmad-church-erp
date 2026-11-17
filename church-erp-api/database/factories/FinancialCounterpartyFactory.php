<?php

namespace Database\Factories;

use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Identity\Models\Church;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<FinancialCounterparty>
 */
class FinancialCounterpartyFactory extends Factory
{
    protected $model = FinancialCounterparty::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(100, 999),
        ];
    }

    public function forChurch(Church $church): static
    {
        return $this->state(fn (): array => ['church_id' => $church->id]);
    }
}
