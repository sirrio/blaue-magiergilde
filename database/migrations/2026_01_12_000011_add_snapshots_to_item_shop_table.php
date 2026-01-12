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
        Schema::table('item_shop', function (Blueprint $table) {
            $table->string('item_name')->nullable()->after('item_id');
            $table->string('item_url')->nullable()->after('item_name');
            $table->string('item_cost')->nullable()->after('item_url');
            $table->string('item_rarity')->nullable()->after('item_cost');
            $table->string('item_type')->nullable()->after('item_rarity');
            $table->string('spell_name')->nullable()->after('spell_id');
            $table->string('spell_url')->nullable()->after('spell_name');
            $table->string('spell_legacy_url')->nullable()->after('spell_url');
            $table->unsignedTinyInteger('spell_level')->nullable()->after('spell_legacy_url');
            $table->string('spell_school')->nullable()->after('spell_level');
        });

        DB::statement(
            'UPDATE item_shop si '
            .'INNER JOIN items i ON i.id = si.item_id '
            .'SET si.item_name = i.name, '
            .'si.item_url = i.url, '
            .'si.item_cost = i.cost, '
            .'si.item_rarity = i.rarity, '
            .'si.item_type = i.type '
            .'WHERE si.item_name IS NULL'
        );

        DB::statement(
            'UPDATE item_shop si '
            .'INNER JOIN spells s ON s.id = si.spell_id '
            .'SET si.spell_name = s.name, '
            .'si.spell_url = s.url, '
            .'si.spell_legacy_url = s.legacy_url, '
            .'si.spell_level = s.spell_level, '
            .'si.spell_school = s.spell_school '
            .'WHERE si.spell_id IS NOT NULL AND si.spell_name IS NULL'
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_shop', function (Blueprint $table) {
            $table->dropColumn([
                'item_name',
                'item_url',
                'item_cost',
                'item_rarity',
                'item_type',
                'spell_name',
                'spell_url',
                'spell_legacy_url',
                'spell_level',
                'spell_school',
            ]);
        });
    }
};
