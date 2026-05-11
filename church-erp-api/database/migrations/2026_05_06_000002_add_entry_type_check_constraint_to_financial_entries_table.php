<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'pgsql'], true)) {
            return;
        }

        DB::statement(
            "ALTER TABLE financial_entries ADD CONSTRAINT financial_entries_entry_type_check CHECK (entry_type IN ('income', 'expense'))",
        );
    }

    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'pgsql'], true)) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE financial_entries DROP CHECK financial_entries_entry_type_check');

            return;
        }

        DB::statement('ALTER TABLE financial_entries DROP CONSTRAINT financial_entries_entry_type_check');
    }
};
