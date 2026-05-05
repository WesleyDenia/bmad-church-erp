<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_categories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('slug', 160);
            $table->string('kind', 32);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['church_id', 'slug']);
            $table->index(['church_id', 'kind']);
            $table->index(['church_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_categories');
    }
};
