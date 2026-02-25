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
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        Schema::table('items', function (Blueprint $table) {
            $table->enum('rarity', [
                'common',
                'uncommon',
                'rare',
                'very_rare',
                'legendary',
                'artifact',
                'unknown_rarity',
            ])->default('common')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        Schema::table('items', function (Blueprint $table) {
            $table->enum('rarity', [
                'common',
                'uncommon',
                'rare',
                'very_rare',
            ])->default('common')->change();
        });
    }
};
