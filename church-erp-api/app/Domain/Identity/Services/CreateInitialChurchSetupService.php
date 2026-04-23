<?php

namespace App\Domain\Identity\Services;

use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Models\ChurchUser;
use App\Models\User;
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
    }
}
