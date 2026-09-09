<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communication_templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('church_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('church_scope_id')->storedAs('coalesce(church_id, 0)');
            $table->string('template_key', 80);
            $table->string('name', 120);
            $table->string('short_description', 240);
            $table->text('body_template');
            $table->string('category', 80);
            $table->string('suggested_channel', 80)->default('external_handoff');
            $table->string('status', 32)->default('active');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['church_scope_id', 'template_key']);
            $table->index('church_id');
            $table->index('status');
            $table->index(['sort_order', 'name', 'template_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communication_templates');
    }
};
