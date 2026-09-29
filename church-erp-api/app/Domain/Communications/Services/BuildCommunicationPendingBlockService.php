<?php

namespace App\Domain\Communications\Services;

use App\Domain\Communications\Models\CommunicationTemplate;
use App\Domain\People\Models\Person;
use Illuminate\Database\Eloquent\Builder;

class BuildCommunicationPendingBlockService
{
    private const PREVIEW_LIMIT = 3;

    /**
     * @var list<array{category: string, label: string, next_step_label: string, template_key: string, person_type: string, statuses: list<string>}>
     */
    private const READY_CATEGORIES = [
        [
            'category' => 'visitor_follow_up_ready',
            'label' => 'Visitantes prontos para primeiro contato',
            'next_step_label' => 'Preparar mensagem',
            'template_key' => 'visitante_primeiro_contato',
            'person_type' => 'visitor',
            'statuses' => ['new', 'follow_up_needed'],
        ],
        [
            'category' => 'member_update_ready',
            'label' => 'Membros prontos para atualizacao cadastral',
            'next_step_label' => 'Preparar mensagem',
            'template_key' => 'atualizacao_cadastro',
            'person_type' => 'member',
            'statuses' => ['needs_update'],
        ],
    ];

    /**
     * @return array<string, mixed>
     */
    public function build(int $churchId): array
    {
        $items = [];

        foreach (self::READY_CATEGORIES as $category) {
            $this->appendReadyOrTemplateBlockedItem($items, $churchId, $category);
        }

        $this->appendMissingContactItem($items, $churchId);

        $items = $this->sortItems($items);
        $totalCount = array_sum(array_map(fn (array $item): int => (int) $item['count'], $items));

        return [
            'state' => $this->stateFor($items),
            'summary' => $totalCount === 0
                ? 'Nao ha comunicacao pendente agora.'
                : 'Ha acompanhamentos prontos para preparar mensagem.',
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @param  array{category: string, label: string, next_step_label: string, template_key: string, person_type: string, statuses: list<string>}  $category
     */
    private function appendReadyOrTemplateBlockedItem(array &$items, int $churchId, array $category): void
    {
        $query = $this->eligiblePeopleQuery($churchId, $category['person_type'], $category['statuses'])
            ->where($this->hasContactConstraint());
        $count = (clone $query)->count('id');

        if ($count === 0) {
            return;
        }

        if (! $this->templateExists($churchId, $category['template_key'])) {
            $items[] = [
                'category' => 'missing_template_for_communication',
                'label' => 'Modelo de comunicacao indisponivel',
                'count' => $count,
                'next_step_label' => 'Revisar modelos',
                'template_key' => $category['template_key'],
                'href' => '/communications',
                'people_preview' => [],
            ];

            return;
        }

        $peoplePreview = (clone $query)
            ->select(['id', 'person_type', 'display_name', 'status', 'phone', 'email', 'created_at'])
            ->orderedForCommunication()
            ->limit(self::PREVIEW_LIMIT)
            ->get()
            ->map(fn (Person $person): array => $this->previewPerson($person))
            ->values()
            ->all();
        $firstPerson = $peoplePreview[0] ?? null;

        if (! is_array($firstPerson)) {
            return;
        }

        $items[] = [
            'category' => $category['category'],
            'label' => $category['label'],
            'count' => $count,
            'next_step_label' => $category['next_step_label'],
            'template_key' => $category['template_key'],
            'href' => $this->communicationHref($category['template_key'], $category['person_type'], (int) $firstPerson['person_id']),
            'people_preview' => $peoplePreview,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function appendMissingContactItem(array &$items, int $churchId): void
    {
        $query = $this->communicationRelevantPeopleQuery($churchId)
            ->where($this->missingContactConstraint());
        $count = (clone $query)->count('id');

        if ($count === 0) {
            return;
        }

        $items[] = [
            'category' => 'missing_contact_for_communication',
            'label' => 'Pessoas com comunicacao pendente sem contato',
            'count' => $count,
            'next_step_label' => 'Completar contato',
            'template_key' => null,
            'href' => '/secretaria/pessoas?person_type=all&status=all&contact=missing_contact',
            'people_preview' => (clone $query)
                ->select(['id', 'person_type', 'display_name', 'status', 'phone', 'email', 'created_at'])
                ->orderedForCommunication()
                ->limit(self::PREVIEW_LIMIT)
                ->get()
                ->map(fn (Person $person): array => $this->previewPerson($person))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return Builder<Person>
     */
    private function communicationRelevantPeopleQuery(int $churchId): Builder
    {
        return Person::query()
            ->forChurch($churchId)
            ->where('status', '!=', 'inactive')
            ->where(function (Builder $query): void {
                foreach (self::READY_CATEGORIES as $category) {
                    $query->orWhere(function (Builder $categoryQuery) use ($category): void {
                        $categoryQuery
                            ->where('person_type', $category['person_type'])
                            ->whereIn('status', $category['statuses']);
                    });
                }
            });
    }

    /**
     * @param  list<string>  $statuses
     * @return Builder<Person>
     */
    private function eligiblePeopleQuery(int $churchId, string $personType, array $statuses): Builder
    {
        return Person::query()
            ->forChurch($churchId)
            ->where('person_type', $personType)
            ->where('status', '!=', 'inactive')
            ->whereIn('status', $statuses);
    }

    private function hasContactConstraint(): \Closure
    {
        return function (Builder $query): void {
            $query
                ->whereNotNull('phone')
                ->where('phone', '!=', '')
                ->orWhere(function (Builder $emailQuery): void {
                    $emailQuery
                        ->whereNotNull('email')
                        ->where('email', '!=', '');
                });
        };
    }

    private function missingContactConstraint(): \Closure
    {
        return function (Builder $query): void {
            $query
                ->where(function (Builder $phoneQuery): void {
                    $phoneQuery->whereNull('phone')->orWhere('phone', '');
                })
                ->where(function (Builder $emailQuery): void {
                    $emailQuery->whereNull('email')->orWhere('email', '');
                });
        };
    }

    private function templateExists(int $churchId, string $templateKey): bool
    {
        return CommunicationTemplate::query()
            ->activeBaseOrTenant($churchId)
            ->where('template_key', $templateKey)
            ->exists();
    }

    private function communicationHref(string $templateKey, string $personType, int $personId): string
    {
        return '/communications?'.http_build_query([
            'template_key' => $templateKey,
            'person_type' => $personType,
            'person_id' => $personId,
            'source' => 'secretary_home',
        ], '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * @return array{person_id: int, person_type: string, display_name: string, status: string, status_label: string, contact_summary: string}
     */
    private function previewPerson(Person $person): array
    {
        return [
            'person_id' => (int) $person->id,
            'person_type' => (string) $person->person_type,
            'display_name' => (string) $person->display_name,
            'status' => (string) $person->status,
            'status_label' => $this->statusLabel((string) $person->status),
            'contact_summary' => $this->contactSummary($person),
        ];
    }

    private function contactSummary(Person $person): string
    {
        $hasPhone = $person->phone !== null && $person->phone !== '';
        $hasEmail = $person->email !== null && $person->email !== '';

        if ($hasPhone && $hasEmail) {
            return 'Contato disponivel';
        }

        if ($hasPhone) {
            return 'Telefone informado';
        }

        if ($hasEmail) {
            return 'Email informado';
        }

        return 'Contato pendente';
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'needs_update' => 'Precisa de atualizacao',
            'new' => 'Novo',
            'follow_up_needed' => 'Precisa de acompanhamento',
            default => 'Situacao nao informada',
        };
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function sortItems(array $items): array
    {
        $priority = [
            'visitor_follow_up_ready' => 0,
            'member_update_ready' => 1,
            'missing_contact_for_communication' => 2,
            'missing_template_for_communication' => 3,
        ];

        usort($items, fn (array $left, array $right): int => ($priority[$left['category']] ?? 99) <=> ($priority[$right['category']] ?? 99));

        return $items;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function stateFor(array $items): string
    {
        if ($items === []) {
            return 'empty_communication_pending';
        }

        if (count($items) === 1 && $items[0]['category'] === 'missing_contact_for_communication') {
            return 'blocked_missing_contact';
        }

        return 'communication_pending_loaded';
    }
}
