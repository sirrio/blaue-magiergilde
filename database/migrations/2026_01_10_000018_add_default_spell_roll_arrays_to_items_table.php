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
        Schema::table('items', function (Blueprint $table) {
            $table->json('default_spell_levels')->nullable()->after('default_spell_level');
            $table->json('default_spell_schools')->nullable()->after('default_spell_school');
        });

        DB::table('items')
            ->select(['id', 'default_spell_roll_enabled', 'default_spell_level', 'default_spell_school'])
            ->where('default_spell_roll_enabled', true)
            ->whereNotNull('default_spell_level')
            ->orderBy('id')
            ->chunkById(200, function ($items) {
                foreach ($items as $item) {
                    $levels = [$item->default_spell_level];
                    $schools = $item->default_spell_school ? [$item->default_spell_school] : [];
                    DB::table('items')
                        ->where('id', $item->id)
                        ->update([
                            'default_spell_levels' => json_encode($levels),
                            'default_spell_schools' => $schools === [] ? null : json_encode($schools),
                        ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['default_spell_levels', 'default_spell_schools']);
        });
    }
};
