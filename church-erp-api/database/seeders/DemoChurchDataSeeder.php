<?php

namespace Database\Seeders;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Models\FinancialEntry;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Domain\People\Models\Person;
use App\Models\User;
use Database\Factories\FinancialCategoryFactory;
use Database\Factories\FinancialCounterpartyFactory;
use Database\Factories\FinancialEntryAuditFactory;
use Database\Factories\FinancialEntryFactory;
use Database\Factories\PersonFactory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DemoChurchDataSeeder extends Seeder
{
    private const MEMBER_COUNT = 50;

    private const VISITOR_COUNT = 18;

    private const FINANCIAL_ENTRY_COUNT = 200;

    /**
     * @var list<array{name: string, slug: string, admin_name: string, admin_email: string}>
     */
    private const CHURCHES = [
        [
            'name' => 'Igreja 1',
            'slug' => 'igreja-1',
            'admin_name' => 'Tester_1',
            'admin_email' => 'igreja_1@teste.com',
        ],
        [
            'name' => 'Igreja 2',
            'slug' => 'igreja-2',
            'admin_name' => 'Tester_2',
            'admin_email' => 'igreja_2@teste.com',
        ],
    ];

    public function run(): void
    {
        foreach (self::CHURCHES as $churchData) {
            $church = Church::query()->firstOrCreate(
                ['slug' => $churchData['slug']],
                ['name' => $churchData['name']],
            );

            $admin = $this->seedAdministrator($church, $churchData);
            $categories = $this->seedCategories($church);
            $counterparties = $this->seedCounterparties($church);

            $this->seedPeople($church);
            $this->seedFinancialEntries($church, $admin, $categories, $counterparties);
        }
    }

    /**
     * @param  array{name: string, slug: string, admin_name: string, admin_email: string}  $churchData
     */
    private function seedAdministrator(Church $church, array $churchData): User
    {
        $admin = User::query()->where('email', $churchData['admin_email'])->first();

        if ($admin === null) {
            $admin = User::factory()->create([
                'name' => $churchData['admin_name'],
                'email' => $churchData['admin_email'],
                'password' => 'password', // pragma: allowlist secret
            ]);
        } else {
            $admin->forceFill([
                'name' => $churchData['admin_name'],
                'password' => 'password', // pragma: allowlist secret
            ])->save();
        }

        ChurchUser::query()->updateOrCreate(
            ['church_id' => $church->id, 'user_id' => $admin->id],
            ['role' => 'administrator', 'status' => 'active'],
        );

        return $admin;
    }

    /**
     * @return Collection<int, FinancialCategory>
     */
    private function seedCategories(Church $church): Collection
    {
        $categories = [
            ['name' => 'Dizimos', 'slug' => 'dizimos', 'kind' => 'income'],
            ['name' => 'Ofertas', 'slug' => 'ofertas', 'kind' => 'income'],
            ['name' => 'Doacoes especiais', 'slug' => 'doacoes-especiais', 'kind' => 'income'],
            ['name' => 'Eventos', 'slug' => 'eventos', 'kind' => 'income'],
            ['name' => 'Despesas operacionais', 'slug' => 'despesas-operacionais', 'kind' => 'expense'],
            ['name' => 'Acao social', 'slug' => 'acao-social', 'kind' => 'expense'],
            ['name' => 'Missoes', 'slug' => 'missoes', 'kind' => 'expense'],
            ['name' => 'Manutencao', 'slug' => 'manutencao', 'kind' => 'expense'],
        ];

        foreach ($categories as $category) {
            $exists = FinancialCategory::query()
                ->forChurch($church->id)
                ->where('slug', $category['slug'])
                ->exists();

            if ($exists) {
                continue;
            }

            FinancialCategoryFactory::new()
                ->forChurch($church)
                ->state([
                    ...$category,
                    'is_default' => in_array($category['slug'], [
                        'dizimos',
                        'ofertas',
                        'despesas-operacionais',
                        'acao-social',
                    ], true),
                ])
                ->create();
        }

        return FinancialCategory::query()
            ->forChurch($church->id)
            ->orderBy('id')
            ->get();
    }

    /**
     * @return Collection<int, FinancialCounterparty>
     */
    private function seedCounterparties(Church $church): Collection
    {
        $names = [
            'Membros e congregados',
            'Fornecedor de energia',
            'Mercado solidario',
            'Ministerio de missoes',
            'Equipe de manutencao',
            'Editora e ensino',
            'Locacao de espaco',
            'Convidados de eventos',
        ];

        foreach ($names as $name) {
            $slug = Str::slug($name);
            $exists = FinancialCounterparty::query()
                ->forChurch($church->id)
                ->where('slug', $slug)
                ->exists();

            if (! $exists) {
                FinancialCounterpartyFactory::new()
                    ->forChurch($church)
                    ->state(['name' => $name, 'slug' => $slug])
                    ->create();
            }
        }

        return FinancialCounterparty::query()
            ->forChurch($church->id)
            ->orderBy('id')
            ->get();
    }

    private function seedPeople(Church $church): void
    {
        $existingMembers = Person::query()
            ->forChurch($church->id)
            ->where('person_type', 'member')
            ->count();

        for ($index = $existingMembers; $index < self::MEMBER_COUNT; $index++) {
            $hasContact = $index % 4 !== 0;

            PersonFactory::new()
                ->forChurch($church)
                ->member()
                ->state([
                    'display_name' => "{$church->name} Membro ".($index + 1),
                    'status' => match ($index % 10) {
                        7, 8 => 'needs_update',
                        9 => 'inactive',
                        default => 'active',
                    },
                    'phone' => $hasContact ? sprintf('+351 91%07d', $index + 1000000) : null,
                    'email' => $hasContact ? "membro-{$church->id}-".($index + 1).'@teste.com' : null,
                ])
                ->create();
        }

        $existingVisitors = Person::query()
            ->forChurch($church->id)
            ->where('person_type', 'visitor')
            ->count();

        for ($index = $existingVisitors; $index < self::VISITOR_COUNT; $index++) {
            $status = match ($index % 3) {
                0 => 'new',
                1 => 'follow_up_needed',
                default => 'contacted',
            };

            PersonFactory::new()
                ->forChurch($church)
                ->visitor()
                ->state([
                    'display_name' => "{$church->name} Visitante ".($index + 1),
                    'status' => $status,
                    'phone' => $index % 4 === 0 ? null : sprintf('+351 92%07d', $index + 1000000),
                    'email' => $index % 4 === 0 ? null : "visitante-{$church->id}-".($index + 1).'@teste.com',
                    'last_contacted_at' => $status === 'contacted' ? now()->subDays($index + 1) : null,
                ])
                ->create();
        }
    }

    /**
     * @param  Collection<int, FinancialCategory>  $categories
     * @param  Collection<int, FinancialCounterparty>  $counterparties
     */
    private function seedFinancialEntries(
        Church $church,
        User $admin,
        Collection $categories,
        Collection $counterparties,
    ): void {
        $existingEntries = FinancialEntry::query()->forChurch($church->id)->count();
        $incomeCategories = $categories->where('kind', 'income')->values();
        $expenseCategories = $categories->where('kind', 'expense')->values();
        $costCenters = ['Cultos', 'Administracao', 'Acao social', 'Missoes', 'Ensino'];

        for ($index = $existingEntries; $index < self::FINANCIAL_ENTRY_COUNT; $index++) {
            $isIncome = $index % 5 < 3;
            /** @var FinancialCategory $category */
            $category = ($isIncome ? $incomeCategories : $expenseCategories)
                ->get($index % ($isIncome ? $incomeCategories->count() : $expenseCategories->count()));
            /** @var FinancialCounterparty $counterparty */
            $counterparty = $counterparties->get($index % $counterparties->count());

            /** @var FinancialEntry $entry */
            $entry = FinancialEntryFactory::new()
                ->forChurch($church, $category, $counterparty)
                ->state([
                    'amount' => number_format(45 + (($index * 37) % 1800) + (($index % 9) / 10), 2, '.', ''),
                    'cost_center_name' => $costCenters[$index % count($costCenters)],
                    'created_at' => now()->subDays(($index * 11) % 365),
                    'updated_at' => now()->subDays(($index * 11) % 365),
                ])
                ->create();

            if ($index % 10 === 0) {
                FinancialEntryAuditFactory::new()
                    ->state([
                        'financial_entry_id' => $entry->id,
                        'user_id' => $admin->id,
                        'church_id' => $church->id,
                        'old_values' => [
                            'entry_type' => $entry->entry_type,
                            'amount' => number_format((float) $entry->amount - 10, 2, '.', ''),
                            'financial_category_id' => $entry->financial_category_id,
                            'counterparty_id' => $entry->counterparty_id,
                            'cost_center_name' => $entry->cost_center_name,
                        ],
                        'new_values' => [
                            'entry_type' => $entry->entry_type,
                            'amount' => $entry->amount,
                            'financial_category_id' => $entry->financial_category_id,
                            'counterparty_id' => $entry->counterparty_id,
                            'cost_center_name' => $entry->cost_center_name,
                        ],
                        'created_at' => now()->subDays($index % 6),
                        'updated_at' => now()->subDays($index % 6),
                    ])
                    ->create();
            }
        }
    }
}
