<?php

namespace App\Domain\People\Services;

use App\Domain\People\Models\Person;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListPeopleService
{
    /**
     * @param  array{church_id: int, q: ?string, person_type: string, statuses: list<string>, contact: string, page: int, per_page: int}  $filters
     * @return LengthAwarePaginator<int, Person>
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $churchId = $filters['church_id'];
        $query = Person::query()
            ->forChurch($churchId);

        $this->applyPersonType($query, $filters['person_type']);
        $this->applyStatuses($query, $filters['statuses']);
        $this->applyContactFilter($query, $filters['contact']);
        $this->applySearchTerm($query, $filters['q']);

        return $query
            ->orderBy('display_name')
            ->orderBy('id')
            ->paginate(
                perPage: $filters['per_page'],
                page: $filters['page'],
            );
    }

    /**
     * @param  Builder<Person>  $query
     */
    private function applyPersonType(Builder $query, string $personType): void
    {
        if ($personType === 'all') {
            return;
        }

        $query->where('person_type', $personType);
    }

    /**
     * @param  Builder<Person>  $query
     * @param  list<string>  $statuses
     */
    private function applyStatuses(Builder $query, array $statuses): void
    {
        if ($statuses === []) {
            return;
        }

        $query->whereIn('status', $statuses);
    }

    /**
     * @param  Builder<Person>  $query
     */
    private function applyContactFilter(Builder $query, string $contact): void
    {
        if ($contact === 'all') {
            return;
        }

        if ($contact === 'with_contact') {
            $query->where(function (Builder $contactQuery): void {
                $contactQuery
                    ->whereNotNull('phone')
                    ->orWhereNotNull('email');
            });

            return;
        }

        if ($contact === 'missing_contact') {
            $query
                ->whereNull('phone')
                ->whereNull('email');

            return;
        }

        if ($contact === 'phone_only') {
            $query
                ->whereNotNull('phone')
                ->whereNull('email');

            return;
        }

        if ($contact === 'email_only') {
            $query
                ->whereNull('phone')
                ->whereNotNull('email');
        }
    }

    /**
     * @param  Builder<Person>  $query
     */
    private function applySearchTerm(Builder $query, ?string $term): void
    {
        if ($term === null) {
            return;
        }

        $normalized = strtolower($term);

        $query->whereRaw('LOWER(display_name) LIKE ?', ["%{$normalized}%"]);
    }
}
