<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('entry_type', 32);
            $table->decimal('amount', 12, 2);
            $table->foreignId('financial_category_id')->constrained('financial_categories')->restrictOnDelete();
            $table->string('counterparty_name', 160);
            $table->string('cost_center_name', 160);
            $table->timestamps();

            $table->index(['church_id', 'entry_type']);
            $table->index(['church_id', 'financial_category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_entries');
    }
};
