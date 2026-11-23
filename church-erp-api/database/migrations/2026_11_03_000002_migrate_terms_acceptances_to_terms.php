<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('terms_acceptances', 'term_id')) {
            Schema::table('terms_acceptances', function (Blueprint $table): void {
                $table->foreignId('term_id')
                    ->nullable()
                    ->constrained('terms')
                    ->restrictOnDelete();
            });
        }

        DB::table('terms_acceptances')->orderBy('id')->each(function (object $acceptance): void {
            $termId = DB::table('terms')
                ->where('content_hash', $acceptance->terms_content_hash)
                ->value('id');

            if ($termId === null) {
                throw new RuntimeException(sprintf('Aceite de termos %d nao possui versao correspondente.', $acceptance->id));
            }

            DB::table('terms_acceptances')
                ->where('id', $acceptance->id)
                ->update(['term_id' => $termId]);
        });

        if (DB::table('terms_acceptances')->whereNull('term_id')->exists()) {
            throw new RuntimeException('Existem aceites de termos sem versao migrada.');
        }

        if (DB::table('terms_acceptances')
            ->select('user_id', 'term_id')
            ->groupBy('user_id', 'term_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists()) {
            throw new RuntimeException('Existem aceites historicos duplicados para a mesma versao de termo.');
        }

        Schema::table('terms_acceptances', function (Blueprint $table): void {
            $table->foreignId('term_id')->nullable(false)->change();
        });

        if (! $this->hasIndex('terms_acceptances_user_id_term_id_unique')) {
            Schema::table('terms_acceptances', function (Blueprint $table): void {
                $table->unique(['user_id', 'term_id']);
            });
        }

        if (! $this->hasIndex('terms_acceptances_term_id_accepted_at_index')) {
            Schema::table('terms_acceptances', function (Blueprint $table): void {
                $table->index(['term_id', 'accepted_at']);
            });
        }

        if (Schema::hasColumn('terms_acceptances', 'setting_id')) {
            if ($this->hasIndex('terms_acceptances_user_id_setting_id_unique')) {
                Schema::table('terms_acceptances', function (Blueprint $table): void {
                    $table->dropUnique(['user_id', 'setting_id']);
                });
            }

            if ($this->hasForeignKey('terms_acceptances_setting_id_foreign')) {
                Schema::table('terms_acceptances', function (Blueprint $table): void {
                    $table->dropForeign(['setting_id']);
                });
            }

            if ($this->hasIndex('terms_acceptances_setting_id_accepted_at_index')) {
                Schema::table('terms_acceptances', function (Blueprint $table): void {
                    $table->dropIndex(['setting_id', 'accepted_at']);
                });
            }

            Schema::table('terms_acceptances', function (Blueprint $table): void {
                $table->dropColumn('setting_id');
            });
        }
    }

    private function hasIndex(string $indexName): bool
    {
        if (DB::getDriverName() === 'mysql') {
            return DB::table('information_schema.statistics')
                ->where('table_schema', DB::getDatabaseName())
                ->where('table_name', 'terms_acceptances')
                ->where('index_name', $indexName)
                ->exists();
        }

        return collect(DB::select("PRAGMA index_list('terms_acceptances')"))
            ->contains(fn (object $index): bool => $index->name === $indexName);
    }

    private function hasForeignKey(string $foreignKeyName): bool
    {
        if (DB::getDriverName() !== 'mysql') {
            return true;
        }

        return DB::table('information_schema.table_constraints')
            ->where('constraint_schema', DB::getDatabaseName())
            ->where('table_name', 'terms_acceptances')
            ->where('constraint_name', $foreignKeyName)
            ->where('constraint_type', 'FOREIGN KEY')
            ->exists();
    }

    public function down(): void
    {
        Schema::table('terms_acceptances', function (Blueprint $table): void {
            $table->foreignId('setting_id')->nullable()->constrained('settings')->restrictOnDelete();
        });

        $settingsByHash = DB::table('settings')->get()
            ->mapWithKeys(fn (object $setting): array => [hash('sha256', $setting->value) => $setting->id]);

        DB::table('terms_acceptances')->orderBy('id')->each(function (object $acceptance) use ($settingsByHash): void {
            $settingId = $settingsByHash->get($acceptance->terms_content_hash);

            if ($settingId === null) {
                throw new RuntimeException(sprintf('Aceite de termos %d nao pode ser revertido sem perder sua versao.', $acceptance->id));
            }

            DB::table('terms_acceptances')
                ->where('id', $acceptance->id)
                ->update(['setting_id' => $settingId]);
        });

        Schema::table('terms_acceptances', function (Blueprint $table): void {
            $table->foreignId('setting_id')->nullable(false)->change();
            $table->unique(['user_id', 'setting_id']);
            $table->index(['setting_id', 'accepted_at']);
            $table->dropUnique(['user_id', 'term_id']);
            $table->dropIndex(['term_id', 'accepted_at']);
            $table->dropForeign(['term_id']);
            $table->dropColumn('term_id');
        });
    }
};
