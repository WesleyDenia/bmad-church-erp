<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_entry_audits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('financial_entry_id')->constrained('financial_entries')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->json('old_values');
            $table->json('new_values');
            $table->text('reason');
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['church_id', 'financial_entry_id']);
            $table->index(['church_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_entry_audits');
    }
};
