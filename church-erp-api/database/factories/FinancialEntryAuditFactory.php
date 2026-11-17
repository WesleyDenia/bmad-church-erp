<?php

namespace Database\Factories;

use App\Domain\Finance\Models\FinancialEntryAudit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinancialEntryAudit>
 */
class FinancialEntryAuditFactory extends Factory
{
    protected $model = FinancialEntryAudit::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'old_values' => ['amount' => '0.00'],
            'new_values' => ['amount' => '1.00'],
            'reason' => 'Conferencia de dados de demonstracao.',
            'ip_address' => fake()->ipv4(),
        ];
    }
}
