<?php

namespace App\Domain\Communications\Services;

use App\Domain\Communications\Models\CommunicationTemplate;
use App\Domain\Communications\Support\RenderCommunicationTemplateBody;
use App\Domain\People\Models\Person;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class PrepareCommunicationMessageDraftService
{
    public function __construct(
        private readonly RenderCommunicationTemplateBody $renderer,
    ) {}

    /**
     * @param  array{template_key: string, person_type: string, person_id: int}  $payload
     * @return array{template: CommunicationTemplate, person: Person, draft: array{message_body: string, missing_fields: list<array<string, string>>, used_fields: list<string>, editable: bool}, contact_summary: string, status_label: string}
     */
    public function prepare(int $churchId, User $actor, array $payload, ?string $correlationId = null): array
    {
        $templateKey = $payload['template_key'];
        $personType = $payload['person_type'];
        $personId = $payload['person_id'];
        $correlationId ??= (string) Str::uuid();

        try {
            $template = $this->findTemplate($churchId, $templateKey);
            $person = $this->findPerson($churchId, $personType, $personId);
            $statusLabel = $this->statusLabel((string) $person->status);
            $contactSummary = $this->contactSummary($person);
            $rendered = $this->renderer->render((string) $template->body_template, [
                'nome' => (string) $person->display_name,
                'contato' => $this->contactValue($person),
                'status' => $statusLabel,
            ]);
        } catch (NotFoundHttpException $exception) {
            $this->logAttempt($actor, $churchId, $personType, $personId, $templateKey, 'not_found', $correlationId);

            throw $exception;
        } catch (ValidationException $exception) {
            $this->logAttempt($actor, $churchId, $personType, $personId, $templateKey, 'validation_failed', $correlationId);

            throw $exception;
        } catch (Throwable $exception) {
            $this->logAttempt($actor, $churchId, $personType, $personId, $templateKey, 'error', $correlationId);

            throw $exception;
        }

        $missingFields = [
            ...$this->personMissingFields($person),
            ...$rendered['missing_fields'],
        ];

        $this->logAttempt($actor, $churchId, $personType, $personId, $templateKey, 'success', $correlationId);

        return [
            'template' => $template,
            'person' => $person,
            'contact_summary' => $contactSummary,
            'status_label' => $statusLabel,
            'draft' => [
                'message_body' => $rendered['message_body'],
                'missing_fields' => $missingFields,
                'used_fields' => $rendered['used_fields'],
                'editable' => true,
            ],
        ];
    }

    private function logAttempt(
        User $actor,
        int $churchId,
        string $personType,
        int $personId,
        string $templateKey,
        string $outcome,
        string $correlationId,
    ): void {
        Log::info('communication_message_draft_attempted', [
            'actor_user_id' => $actor->id,
            'church_id' => $churchId,
            'person_type' => $personType,
            'person_id' => $personId,
            'template_key' => $templateKey,
            'outcome' => $outcome,
            'timestamp' => Carbon::now('UTC')->toISOString(),
            'correlation_id' => $correlationId,
        ]);
    }

    private function findTemplate(int $churchId, string $templateKey): CommunicationTemplate
    {
        $templates = CommunicationTemplate::query()
            ->select([
                'church_id',
                'template_key',
                'name',
                'category',
                'suggested_channel',
                'body_template',
                'status',
                'sort_order',
            ])
            ->activeBaseOrTenant($churchId)
            ->where('template_key', $templateKey)
            ->orderByRaw('CASE WHEN church_id IS NULL THEN 0 ELSE 1 END')
            ->get();

        $template = $templates->firstWhere('church_id', $churchId) ?? $templates->first();

        if (! $template instanceof CommunicationTemplate) {
            throw new NotFoundHttpException('Nao foi possivel preparar esta mensagem.');
        }

        return $template;
    }

    private function findPerson(int $churchId, string $personType, int $personId): Person
    {
        $person = Person::query()
            ->forChurch($churchId)
            ->where('person_type', $personType)
            ->where('status', '!=', 'inactive')
            ->whereKey($personId)
            ->first();

        if (! $person instanceof Person) {
            throw new NotFoundHttpException('Nao foi possivel preparar esta mensagem.');
        }

        return $person;
    }

    private function contactValue(Person $person): string
    {
        if ($person->phone !== null && $person->email !== null) {
            return "Telefone: {$person->phone}; Email: {$person->email}";
        }

        if ($person->phone !== null) {
            return "Telefone: {$person->phone}";
        }

        if ($person->email !== null) {
            return "Email: {$person->email}";
        }

        return '[contato pendente]';
    }

    private function contactSummary(Person $person): string
    {
        if ($person->phone === null && $person->email === null) {
            return 'Contato pendente';
        }

        return $this->contactValue($person);
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'active' => 'Ativo',
            'needs_update' => 'Precisa de atualizacao',
            'inactive' => 'Inativo',
            'new' => 'Novo',
            'follow_up_needed' => 'Precisa de acompanhamento',
            'contacted' => 'Contatado',
            default => 'Situacao nao informada',
        };
    }

    /**
     * @return list<array<string, string>>
     */
    private function personMissingFields(Person $person): array
    {
        $missing = [];

        if ($person->phone === null && $person->email === null) {
            $missing[] = [
                'field' => 'contact',
                'label' => 'Contato',
                'message' => 'Telefone ou email ainda nao foi informado.',
            ];
        }

        if ($person->status === 'needs_update') {
            $missing[] = [
                'field' => 'profile_needs_update',
                'label' => 'Cadastro para conferir',
                'message' => 'Confira os dados da pessoa antes do handoff.',
            ];
        }

        return $missing;
    }
}
