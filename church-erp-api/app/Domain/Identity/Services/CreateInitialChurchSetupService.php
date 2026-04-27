<?php

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateInitialChurchSetupService
{
    /**
     * @param  array{church_name: string, admin_name: string, admin_email: string, password: string}  $payload
     * @return array{church: Church, admin: User, membership: ChurchUser}
     */
    public function create(array $payload): array
    {
        $slug = Str::slug($payload['church_name']);

        if ($slug === '') {
            throw ValidationException::withMessages([
                'church_name' => ['Informe um nome de igreja valido.'],
            ]);
        }

        if (Church::query()->where('slug', $slug)->exists()) {
            throw ValidationException::withMessages([
                'church_name' => ['Ja existe uma igreja configurada com este nome.'],
            ]);
        }

        try {
            return DB::transaction(function () use ($payload, $slug): array {
                $church = Church::query()->create([
                    'name' => $payload['church_name'],
                    'slug' => $slug,
                ]);

                $admin = User::query()->create([
                    'name' => $payload['admin_name'],
                    'email' => $payload['admin_email'],
                    'password' => $payload['password'],
                ]);

                $membership = ChurchUser::query()->create([
                    'church_id' => $church->id,
                    'user_id' => $admin->id,
                    'role' => 'administrator',
                    'status' => 'active',
                ]);

                return [
                    'church' => $church,
                    'admin' => $admin,
                    'membership' => $membership,
                ];
            });
        } catch (QueryException $exception) {
            if (! $this->isDuplicateConstraintViolation($exception)) {
                throw $exception;
            }

            throw ValidationException::withMessages(
                $this->duplicateConstraintMessages($exception->getMessage()),
            );
        }
    }

    private function isDuplicateConstraintViolation(QueryException $exception): bool
    {
        $message = $exception->getMessage();
        $errorInfo = $exception->errorInfo ?? [];
        $sqlState = $errorInfo[0] ?? null;
        $driverCode = $errorInfo[1] ?? null;

        if ($sqlState === '23000' && in_array($driverCode, [19, 1062], true)) {
            return true;
        }

        return Str::contains($message, [
            'churches.slug',
            'churches_slug_unique',
            'users.email',
            'users_email_unique',
            'unique constraint failed: churches.slug',
            'unique constraint failed: users.email',
        ]);
    }

    /**
     * @return array<string, list<string>>
     */
    private function duplicateConstraintMessages(string $message): array
    {
        if (Str::contains($message, ['churches.slug', 'churches_slug_unique', 'unique constraint failed: churches.slug'])) {
            return [
                'church_name' => ['Ja existe uma igreja configurada com este nome.'],
            ];
        }

        if (Str::contains($message, ['users.email', 'users_email_unique', 'unique constraint failed: users.email'])) {
            return [
                'admin_email' => ['Este email ja esta em uso.'],
            ];
        }

        return [
            'church_name' => ['Nao foi possivel concluir a configuracao agora.'],
            'admin_email' => ['Nao foi possivel concluir a configuracao agora.'],
        ];
    }
}
