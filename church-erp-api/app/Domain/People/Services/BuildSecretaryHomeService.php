<?php

namespace App\Domain\People\Services;

use App\Domain\People\Models\Person;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class BuildSecretaryHomeService
{
    private const VISITOR_WINDOW_DAYS = 30;

    private const VISITOR_LIMIT = 5;

    /**
     * @return array<string, mixed>
     */
    public function build(int $churchId): array
    {
        $peopleCount = Person::query()->forChurch($churchId)->count();
        $recentVisitors = $this->recentVisitors($churchId);

        return [
            'state' => $peopleCount === 0 ? 'empty_secretary_home' : 'secretary_home_loaded',
            'people_pending_items' => $this->buildPendingBlock($churchId),
            'recent_visitors' => $this->buildRecentVisitorsBlock($recentVisitors),
            'quick_actions' => $this->quickActions(),
            'event_schedule' => [
                'state' => 'event_schedule_unavailable',
                'summary' => 'A programacao sera exibida quando houver uma fonte real de eventos.',
                'next_step_label' => null,
                'items' => [],
            ],
            'communication_pending' => [
                'state' => 'communication_pending_unavailable',
                'summary' => 'As comunicacoes pendentes serao preparadas na etapa de comunicacao.',
                'next_step_label' => null,
                'items' => [],
            ],
            'weekly_checklist' => [
                'state' => 'weekly_checklist_ready',
                'items' => [
                    ['key' => 'review_recent_visitors', 'label' => 'Revisar visitantes recentes', 'state' => 'not_started'],
                    ['key' => 'complete_missing_contacts', 'label' => 'Completar contatos pendentes', 'state' => 'not_started'],
                    ['key' => 'review_people_needing_updates', 'label' => 'Conferir pessoas que precisam de atualizacao', 'state' => 'not_started'],
                    ['key' => 'prepare_future_communications', 'label' => 'Preparar proximas comunicacoes quando a fonte existir', 'state' => 'not_started'],
                ],
            ],
        ];
    }

    private function pendingPeopleQuery(int $churchId): Builder
    {
        return Person::query()
            ->forChurch($churchId)
            ->where('status', '!=', 'inactive')
            ->where(function ($query): void {
                $query
                    ->whereIn('status', ['new', 'follow_up_needed', 'needs_update'])
                    ->orWhere(function ($contactQuery): void {
                        $contactQuery
                            ->whereNull('phone')
                            ->whereNull('email');
                    });
            });
    }

    /**
     * @return Collection<int, Person>
     */
    private function recentVisitors(int $churchId): Collection
    {
        return Person::query()
            ->forChurch($churchId)
            ->where('person_type', 'visitor')
            ->where('created_at', '>=', Carbon::now('UTC')->subDays(self::VISITOR_WINDOW_DAYS))
            ->orderByDesc('created_at')
            ->limit(self::VISITOR_LIMIT)
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPendingBlock(int $churchId): array
    {
        $items = [];
        $totalCount = $this->pendingPeopleQuery($churchId)->count('id');

        $this->appendPendingItem(
            $items,
            'visitor_follow_up',
            'Visitantes para acompanhamento',
            'Revisar visitantes recentes',
            '/secretaria',
            $this->visitorFollowUpQuery($churchId),
        );
        $this->appendPendingItem(
            $items,
            'missing_contact',
            'Pessoas sem contato minimo',
            'Completar contato',
            '/secretaria',
            $this->missingContactQuery($churchId),
        );
        $this->appendPendingItem(
            $items,
            'needs_update',
            'Pessoas que precisam de atualizacao',
            'Conferir cadastro',
            '/secretaria',
            $this->needsUpdateQuery($churchId),
        );

        return [
            'state' => $totalCount === 0 ? 'empty_people_pending_items' : 'people_pending_items_loaded',
            'total_count' => $totalCount,
            'items' => $items,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function appendPendingItem(
        array &$items,
        string $category,
        string $label,
        string $nextStepLabel,
        string $href,
        Builder $query,
    ): void {
        $count = $query->count('id');

        if ($count === 0) {
            return;
        }

        $items[] = [
            'category' => $category,
            'label' => $label,
            'count' => $count,
            'next_step_label' => $nextStepLabel,
            'href' => $href,
            'people_preview' => $query
                ->orderBy('display_name')
                ->limit(3)
                ->get()
                ->map(fn (Person $person): array => $this->previewPerson($person))
                ->values()
                ->all(),
        ];
    }

    private function visitorFollowUpQuery(int $churchId): Builder
    {
        return Person::query()
            ->forChurch($churchId)
            ->where('person_type', 'visitor')
            ->whereIn('status', ['new', 'follow_up_needed']);
    }

    private function missingContactQuery(int $churchId): Builder
    {
        return Person::query()
            ->forChurch($churchId)
            ->where('status', '!=', 'inactive')
            ->whereNull('phone')
            ->whereNull('email');
    }

    private function needsUpdateQuery(int $churchId): Builder
    {
        return Person::query()
            ->forChurch($churchId)
            ->where('status', 'needs_update');
    }

    /**
     * @param  Collection<int, Person>  $visitors
     * @return array<string, mixed>
     */
    private function buildRecentVisitorsBlock(Collection $visitors): array
    {
        return [
            'state' => $visitors->isEmpty() ? 'empty_recent_visitors' : 'recent_visitors_loaded',
            'window_days' => self::VISITOR_WINDOW_DAYS,
            'limit' => self::VISITOR_LIMIT,
            'items' => $visitors
                ->map(fn (Person $person): array => [
                    ...$this->previewPerson($person),
                    'next_step_label' => $person->status === 'contacted' ? 'Registrar proximo contato' : 'Acompanhar visitante',
                    'href' => '/secretaria',
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return list<array{label: string, href: string, state: string}>
     */
    private function quickActions(): array
    {
        return [
            ['label' => 'Cadastrar membro', 'href' => '/secretaria/membros/novo', 'state' => 'available'],
            ['label' => 'Cadastrar visitante', 'href' => '/secretaria', 'state' => 'preparing_flow'],
            ['label' => 'Revisar pendencias de pessoas', 'href' => '/secretaria', 'state' => 'available'],
        ];
    }

    /**
     * @return array{display_name: string, status: string, contact_summary: ?string}
     */
    private function previewPerson(Person $person): array
    {
        return [
            'display_name' => $person->display_name,
            'status' => $person->status,
            'contact_summary' => $this->contactSummary($person),
        ];
    }

    private function contactSummary(Person $person): ?string
    {
        if ($person->phone !== null && $person->email !== null) {
            return 'Telefone e email informados';
        }

        if ($person->phone !== null) {
            return 'Telefone informado';
        }

        if ($person->email !== null) {
            return 'Email informado';
        }

        return null;
    }
}
