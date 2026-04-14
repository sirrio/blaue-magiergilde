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
        Schema::table('compendium_import_runs', function (Blueprint $table) {
            $table->unsignedInteger('deleted_rows')->default(0)->after('updated_rows');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compendium_import_runs', function (Blueprint $table) {
            $table->dropColumn('deleted_rows');
        });
    }
};
