<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('compendium_import_runs', function (Blueprint $table) {
            $table->enum('entity_type', ['items', 'spells', 'sources'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('compendium_import_runs')
            ->where('entity_type', 'sources')
            ->delete();

        Schema::table('compendium_import_runs', function (Blueprint $table) {
            $table->enum('entity_type', ['items', 'spells'])->change();
        });
    }
};
