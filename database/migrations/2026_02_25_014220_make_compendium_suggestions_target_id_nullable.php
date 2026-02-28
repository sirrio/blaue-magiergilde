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
        Schema::table('compendium_suggestions', function (Blueprint $table) {
            $table->unsignedBigInteger('target_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('compendium_suggestions')
            ->whereNull('target_id')
            ->update(['target_id' => 0]);

        Schema::table('compendium_suggestions', function (Blueprint $table) {
            $table->unsignedBigInteger('target_id')->nullable(false)->change();
        });
    }
};
