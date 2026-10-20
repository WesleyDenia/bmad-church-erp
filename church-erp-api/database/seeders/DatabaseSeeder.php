<?php

namespace Database\Seeders;

use App\Domain\Communications\Services\ProvisionBaseCommunicationTemplatesService;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        app(ProvisionBaseCommunicationTemplatesService::class)->provision();

        User::forceCreate([
            'name' => 'Test User',
            'email' => 'wesley@church.com',
            'password' => bcrypt('12345678'),
            'email_verified_at' => now(),
            'remember_token' => Str::random(10),
        ]);
    }
}
