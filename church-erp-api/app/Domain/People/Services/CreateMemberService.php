<?php

namespace App\Domain\People\Services;

use App\Domain\People\Models\Person;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CreateMemberService
{
    /**
     * @param  array{church_id: int, display_name: string, status: string, phone: ?string, email: ?string}  $payload
     */
    public function create(array $payload): Person
    {
        $payload = $this->normalize($payload);
        $this->ensureEmailIsAvailable($payload['church_id'], $payload['email']);

        try {
            /** @var Person $member */
            $member = DB::transaction(function () use ($payload): Person {
                $member = new Person;
                $member->forceFill([
                    'church_id' => $payload['church_id'],
                    'person_type' => 'member',
                    'status' => $payload['status'],
                    'display_name' => $payload['display_name'],
                    'phone' => $payload['phone'],
                    'email' => $payload['email'],
                ])->save();

                Log::info('people_member_changed', [
                    'event' => 'people_member_changed',
                    'actor_user_id' => (int) Auth::id(),
                    'church_id' => $payload['church_id'],
                    'person_id' => $member->id,
                    'action' => 'created',
                    'changed_fields' => ['display_name', 'status', 'phone', 'email'],
                ]);

                return $member;
            });

            return $member;
        } catch (QueryException $exception) {
            $this->handleDuplicateEmail($exception);

            throw $exception;
        }
    }

    /**
     * @param  array{church_id: int, display_name: string, status: string, phone: ?string, email: ?string}  $payload
     * @return array{church_id: int, display_name: string, status: string, phone: ?string, email: ?string}
     */
    private function normalize(array $payload): array
    {
        $payload['display_name'] = trim($payload['display_name']);
        $payload['phone'] = $payload['phone'] === null ? null : trim($payload['phone']);
        $payload['phone'] = $payload['phone'] === '' ? null : $payload['phone'];
        $payload['email'] = $payload['email'] === null ? null : strtolower(trim($payload['email']));
        $payload['email'] = $payload['email'] === '' ? null : $payload['email'];

        return $payload;
    }

    private function ensureEmailIsAvailable(int $churchId, ?string $email): void
    {
        if ($email === null) {
            return;
        }

        if (
            Person::query()
                ->forChurch($churchId)
                ->where('person_type', 'member')
                ->where('email', $email)
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
