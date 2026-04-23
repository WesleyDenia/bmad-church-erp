<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('church_user', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 64);
            $table->string('status', 32)->default('active');
            $table->timestamps();

            $table->unique(['church_id', 'user_id']);
            $table->index(['church_id', 'role']);
            $table->index(['church_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('church_user');
    }
};
