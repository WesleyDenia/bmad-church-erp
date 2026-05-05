<?php

namespace App\Domain\Identity\Services;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\People\Models\PersonCategory;

class ListInitialCategoryDefaultsService
{
    /**
     * @return array{
     *   financial_categories: list<array{id: int, name: string, slug: string, kind: string}>,
     *   person_categories: list<array{id: int, name: string, slug: string}>
     * }
     */
    public function list(): array
    {
        return [
            'financial_categories' => FinancialCategory::query()
                ->where('is_default', true)
                ->orderBy('slug')
                ->get()
                ->map(fn (FinancialCategory $category): array => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'kind' => $category->kind,
                ])
                ->values()
                ->all(),
            'person_categories' => PersonCategory::query()
                ->where('is_default', true)
                ->orderBy('slug')
                ->get()
                ->map(fn (PersonCategory $category): array => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                ])
                ->values()
                ->all(),
        ];
    }
}
