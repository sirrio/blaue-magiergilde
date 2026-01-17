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
        Schema::table('adventures', function (Blueprint $table) {
            $table->boolean('deleted_by_character')->default(false)->after('deleted_at');
        });
        Schema::table('downtimes', function (Blueprint $table) {
            $table->boolean('deleted_by_character')->default(false)->after('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('adventures', function (Blueprint $table) {
            $table->dropColumn('deleted_by_character');
        });
        Schema::table('downtimes', function (Blueprint $table) {
            $table->dropColumn('deleted_by_character');
        });
    }
};
