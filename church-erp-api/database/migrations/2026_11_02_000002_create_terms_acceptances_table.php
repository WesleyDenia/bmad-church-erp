<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terms_acceptances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('setting_id')->constrained('settings')->restrictOnDelete();
            $table->string('terms_content_hash', 64);
            $table->timestamp('accepted_at');
            $table->timestamps();

            $table->unique(['user_id', 'setting_id']);
            $table->index(['setting_id', 'accepted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terms_acceptances');
    }
};
