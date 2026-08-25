<?php

namespace App\Domain\People\Services;

use App\Domain\People\Models\Person;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class UpdateVisitorService
{
    /**
     * A regra de conversao de visitante para membro fica fora deste endpoint.
     *
     * @param  array{church_id: int, display_name?: string, status?: string, phone?: ?string, email?: ?string}  $payload
     */
    public function update(Person $visitor, array $payload): Person
    {
        $payload = $this->normalize($payload);
        $this->ensureEmailIsAvailable($payload['church_id'], $payload['email'] ?? null, $visitor->id);

        try {
            /** @var Person $updatedVisitor */
            $updatedVisitor = DB::transaction(function () use ($visitor, $payload): Person {
                $changes = [];

                foreach (['display_name', 'status', 'phone', 'email'] as $field) {
                    if (! array_key_exists($field, $payload)) {
                        continue;
                    }

                    if ($visitor->{$field} !== $payload[$field]) {
                        $changes[] = $field;
                    }
                }

                $visitor->forceFill(array_intersect_key($payload, array_flip([
                    'display_name',
                    'status',
                    'phone',
                    'email',
                ])))->save();

                if ($changes !== []) {
                    Log::info('people_visitor_changed', [
                        'event' => 'people_visitor_changed',
                        'actor_user_id' => (int) Auth::id(),
                        'church_id' => $payload['church_id'],
                        'person_id' => $visitor->id,
                        'action' => 'updated',
                        'changed_fields' => $changes,
                    ]);
                }

                return $visitor->fresh() ?? $visitor;
            });

            return $updatedVisitor;
        } catch (QueryException $exception) {
            $this->handleDuplicateEmail($exception);

            throw $exception;
        }
    }

    /**
     * @param  array{church_id: int, display_name?: string, status?: string, phone?: ?string, email?: ?string}  $payload
     * @return array{church_id: int, display_name?: string, status?: string, phone?: ?string, email?: ?string}
     */
    private function normalize(array $payload): array
    {
        if (array_key_exists('display_name', $payload)) {
            $payload['display_name'] = trim((string) $payload['display_name']);
        }

        if (array_key_exists('phone', $payload)) {
            $phone = $payload['phone'] === null ? null : trim((string) $payload['phone']);
            $payload['phone'] = $phone === '' ? null : $phone;
        }

        if (array_key_exists('email', $payload)) {
            $email = $payload['email'] === null ? null : strtolower(trim((string) $payload['email']));
            $payload['email'] = $email === '' ? null : $email;
        }

        return $payload;
    }

    private function ensureEmailIsAvailable(int $churchId, ?string $email, int $visitorId): void
    {
        if ($email === null) {
            return;
        }

        if (
            Person::query()
                ->forChurch($churchId)
                ->where('person_type', 'visitor')
                ->where('email', $email)
                ->whereKeyNot($visitorId)
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'email' => 'Este email ja esta em uso por outro visitante.',
            ]);
        }
    }

    private function handleDuplicateEmail(QueryException $exception): void
    {
        if (str_contains($exception->getMessage(), 'people_church_type_email_unique')) {
            throw ValidationException::withMessages([
                'email' => 'Este email ja esta em uso por outro visitante.',
            ]);
        }
    }
}
