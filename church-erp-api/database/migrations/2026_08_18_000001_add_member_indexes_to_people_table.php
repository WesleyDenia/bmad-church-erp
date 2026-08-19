<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('people', function (Blueprint $table): void {
            $table->index(['church_id', 'person_type', 'display_name'], 'people_church_type_display_name_index');
            $table->unique(['church_id', 'person_type', 'email'], 'people_church_type_email_unique');
        });
    }

    public function down(): void
    {
        Schema::table('people', function (Blueprint $table): void {
            $table->dropUnique('people_church_type_email_unique');
            $table->dropIndex('people_church_type_display_name_index');
        });
    }
};
