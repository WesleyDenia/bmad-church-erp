<?php

namespace App\Domain\People\Services;

use App\Domain\Identity\Models\Church;
use App\Domain\People\Models\PersonCategory;

class ProvisionInitialPersonCategoriesService
{
    public function provision(Church $church): void
    {
        foreach ($this->defaults() as $category) {
            PersonCategory::query()
                ->withoutGlobalScopes()
                ->firstOrCreate(
                    [
                        'church_id' => $church->id,
                        'slug' => $category['slug'],
                    ],
                    [
                        'name' => $category['name'],
                        'is_default' => true,
                    ],
                );
        }
    }

    /**
     * @return list<array{name: string, slug: string}>
     */
    private function defaults(): array
    {
        return [
            [
                'name' => 'Membros',
                'slug' => 'membros',
            ],
            [
                'name' => 'Visitantes',
                'slug' => 'visitantes',
            ],
            [
                'name' => 'Obreiros',
                'slug' => 'obreiros',
            ],
        ];
    }
}
