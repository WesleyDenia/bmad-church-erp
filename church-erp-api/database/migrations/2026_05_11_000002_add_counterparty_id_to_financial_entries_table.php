<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_entries', function (Blueprint $table): void {
            $table
                ->foreignId('counterparty_id')
                ->nullable()
                ->after('financial_category_id')
                ->constrained('financial_counterparties')
                ->nullOnDelete();

            $table->index(['church_id', 'counterparty_id']);
        });
    }

    public function down(): void
    {
        Schema::table('financial_entries', function (Blueprint $table): void {
            $table->dropIndex(['church_id', 'counterparty_id']);
            $table->dropConstrainedForeignId('counterparty_id');
        });
    }
};
