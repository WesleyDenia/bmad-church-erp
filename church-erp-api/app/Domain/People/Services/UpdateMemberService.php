<?php

namespace App\Domain\People\Services;

use App\Domain\People\Models\Person;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class UpdateMemberService
{
    /**
     * @param  array{church_id: int, display_name?: string, status?: string, phone?: ?string, email?: ?string}  $payload
     */
    public function update(Person $member, array $payload): Person
    {
        $payload = $this->normalize($payload);
        $this->ensureEmailIsAvailable($payload['church_id'], $payload['email'] ?? null, $member->id);

        try {
            /** @var Person $updatedMember */
            $updatedMember = DB::transaction(function () use ($member, $payload): Person {
                $changes = [];

                foreach (['display_name', 'status', 'phone', 'email'] as $field) {
                    if (! array_key_exists($field, $payload)) {
                        continue;
                    }

                    if ($member->{$field} !== $payload[$field]) {
                        $changes[] = $field;
                    }
                }

                $member->forceFill(array_intersect_key($payload, array_flip([
                    'display_name',
                    'status',
                    'phone',
                    'email',
                ])))->save();

                Log::info('people_member_changed', [
                    'event' => 'people_member_changed',
                    'actor_user_id' => (int) Auth::id(),
                    'church_id' => $payload['church_id'],
                    'person_id' => $member->id,
                    'action' => 'updated',
                    'changed_fields' => $changes,
                ]);

                return $member->fresh() ?? $member;
            });

            return $updatedMember;
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

    private function ensureEmailIsAvailable(int $churchId, ?string $email, int $memberId): void
    {
        if ($email === null) {
            return;
        }

        if (
            Person::query()
                ->forChurch($churchId)
                ->where('person_type', 'member')
                ->where('email', $email)
                ->whereKeyNot($memberId)
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'email' => 'Este email ja esta em uso por outro membro.',
            ]);
        }
    }

    private function handleDuplicateEmail(QueryException $exception): void
    {
        if (str_contains($exception->getMessage(), 'people_church_type_email_unique')) {
            throw ValidationException::withMessages([
                'email' => 'Este email ja esta em uso por outro membro.',
            ]);
        }
    }
}
