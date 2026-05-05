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
            "ALTER TABLE financial_categories ADD CONSTRAINT financial_categories_kind_check CHECK (kind IN ('income', 'expense'))",
        );
    }

    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'pgsql'], true)) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE financial_categories DROP CHECK financial_categories_kind_check');

            return;
        }

        DB::statement('ALTER TABLE financial_categories DROP CONSTRAINT financial_categories_kind_check');
    }
};
