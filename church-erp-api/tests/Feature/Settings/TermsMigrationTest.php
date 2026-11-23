<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TermsMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_backfills_legacy_terms_acceptances_with_the_matching_term(): void
    {
        Artisan::call('migrate:rollback', ['--step' => 2]);

        $user = User::factory()->create();
        $setting = DB::table('settings')
            ->where('key', 'legal.terms_of_use.v1')
            ->first();

        DB::table('terms_acceptances')->insert([
            'user_id' => $user->id,
            'setting_id' => $setting->id,
            'terms_content_hash' => hash('sha256', $setting->value),
            'accepted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Artisan::call('migrate');

        $term = DB::table('terms')->where('version', 1)->first();

        $this->assertFalse(Schema::hasColumn('terms_acceptances', 'setting_id'));
        $this->assertDatabaseHas('terms_acceptances', [
            'user_id' => $user->id,
            'term_id' => $term->id,
            'terms_content_hash' => hash('sha256', $setting->value),
        ]);
    }
}
