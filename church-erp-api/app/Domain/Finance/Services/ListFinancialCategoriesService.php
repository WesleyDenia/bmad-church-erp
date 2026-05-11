<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinancialCategory;

class ListFinancialCategoriesService
{
    /**
     * @return array{financial_categories: list<array{id: int, name: string, slug: string, kind: string}>}
     */
    public function list(): array
    {
        return [
            'financial_categories' => FinancialCategory::query()
                ->orderBy('kind')
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
        ];
    }
}
