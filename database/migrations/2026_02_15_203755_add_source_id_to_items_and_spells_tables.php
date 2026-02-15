<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->foreignId('source_id')
                ->nullable()
                ->after('type')
                ->constrained('sources')
                ->nullOnDelete();
        });

        Schema::table('spells', function (Blueprint $table) {
            $table->foreignId('source_id')
                ->nullable()
                ->after('spell_level')
                ->constrained('sources')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_id');
        });

        Schema::table('spells', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_id');
        });
    }
};
