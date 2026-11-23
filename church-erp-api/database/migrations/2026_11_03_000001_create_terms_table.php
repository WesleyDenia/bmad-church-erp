<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('terms')) {
            Schema::create('terms', function (Blueprint $table): void {
                $table->id();
                $table->unsignedInteger('version')->unique();
                $table->longText('content');
                $table->string('content_hash', 64)->unique();
                $table->timestamp('published_at');
                $table->timestamp('created_at');
            });
        }

        if (! DB::table('terms')->where('version', 1)->exists()) {
            $currentTerms = DB::table('settings')
                ->where('key', 'legal.terms_of_use.v1')
                ->where('type', 'legal_document')
                ->value('value');

            if (! is_string($currentTerms) || $currentTerms === '') {
                throw new RuntimeException('Nao foi possivel provisionar a versao inicial dos termos.');
            }

            DB::table('terms')->insert([
                'version' => 1,
                'content' => $currentTerms,
                'content_hash' => hash('sha256', $currentTerms),
                'published_at' => now(),
                'created_at' => now(),
            ]);
        }

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::unprepared("CREATE TRIGGER terms_prevent_update BEFORE UPDATE ON terms BEGIN SELECT RAISE(ABORT, 'Terms are immutable'); END;");
            DB::unprepared("CREATE TRIGGER terms_prevent_delete BEFORE DELETE ON terms BEGIN SELECT RAISE(ABORT, 'Terms are immutable'); END;");
        }

    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS terms_prevent_update');
            DB::unprepared('DROP TRIGGER IF EXISTS terms_prevent_delete');
        }

        Schema::dropIfExists('terms');
    }
};
