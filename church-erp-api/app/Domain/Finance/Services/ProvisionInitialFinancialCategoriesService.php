<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Identity\Models\Church;

class ProvisionInitialFinancialCategoriesService
{
    public function provision(Church $church): void
    {
        foreach ($this->defaults() as $category) {
            FinancialCategory::query()
                ->withoutGlobalScopes()
                ->firstOrCreate(
                    [
                        'church_id' => $church->id,
                        'slug' => $category['slug'],
                    ],
                    [
                        'name' => $category['name'],
                        'kind' => $category['kind'],
                        'is_default' => true,
                    ],
                );
        }
    }

    /**
     * @return list<array{name: string, slug: string, kind: string}>
     */
    private function defaults(): array
    {
        return [
            [
                'name' => 'Dizimos',
                'slug' => 'dizimos',
                'kind' => 'income',
            ],
            [
                'name' => 'Ofertas',
                'slug' => 'ofertas',
                'kind' => 'income',
            ],
            [
                'name' => 'Despesas operacionais',
                'slug' => 'despesas-operacionais',
                'kind' => 'expense',
            ],
            [
                'name' => 'Acao social',
                'slug' => 'acao-social',
                'kind' => 'expense',
            ],
        ];
    }
}
