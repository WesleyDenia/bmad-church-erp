<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('people', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->enum('person_type', ['member', 'visitor']);
            $table->enum('status', ['active', 'inactive', 'new', 'follow_up_needed', 'contacted', 'needs_update']);
            $table->string('display_name', 160);
            $table->string('phone', 40)->nullable();
            $table->string('email', 160)->nullable();
            $table->timestamp('last_contacted_at')->nullable();
            $table->timestamps();

            $table->index('church_id');
            $table->index(['church_id', 'person_type', 'created_at']);
            $table->index(['church_id', 'status']);
            $table->index(['church_id', 'person_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('people');
    }
};
