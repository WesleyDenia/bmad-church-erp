<?php

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\ChurchUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class UpdateChurchUserMembershipService
{
    /**
     * @param  array{role?: string, status?: string}  $payload
     */
    public function update(ChurchUser $membership, int $actorUserId, int $churchId, array $payload): ChurchUser
    {
        if ($membership->role === 'administrator') {
            throw ValidationException::withMessages([
                'membership' => ['Memberships administrativos sao somente leitura nesta area.'],
            ]);
        }

        $changes = $this->diff($membership, $payload);

        DB::transaction(function () use ($membership, $payload): void {
            $membership->fill($payload);
            $membership->save();
        });

        if ($changes !== []) {
            Log::info('church_user_membership_updated', [
                'actor_user_id' => $actorUserId,
                'target_membership_id' => $membership->id,
                'target_user_id' => $membership->user_id,
                'church_id' => $churchId,
                'changes' => $changes,
            ]);
        }

        $membership->load('user');

        return $membership;
    }

    /**
     * @param  array{role?: string, status?: string}  $payload
     * @return array<string, array{from: string, to: string}>
     */
    private function diff(ChurchUser $membership, array $payload): array
    {
        $changes = [];

        foreach (['role', 'status'] as $field) {
            if (! array_key_exists($field, $payload)) {
                continue;
            }

            $from = (string) $membership->{$field};
            $to = (string) $payload[$field];

            if ($from === $to) {
                continue;
            }

            $changes[$field] = [
                'from' => $from,
                'to' => $to,
            ];
        }

        return $changes;
    }
}
