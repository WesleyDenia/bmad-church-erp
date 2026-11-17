<?php

namespace Database\Factories;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Identity\Models\Church;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<FinancialCategory>
 */
class FinancialCategoryFactory extends Factory
{
    protected $model = FinancialCategory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(2, true));

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'kind' => 'expense',
            'is_default' => false,
        ];
    }

    public function forChurch(Church $church): static
    {
        return $this->state(fn (): array => ['church_id' => $church->id]);
    }

    public function income(): static
    {
        return $this->state(fn (): array => ['kind' => 'income']);
    }

    public function expense(): static
    {
        return $this->state(fn (): array => ['kind' => 'expense']);
    }
}
