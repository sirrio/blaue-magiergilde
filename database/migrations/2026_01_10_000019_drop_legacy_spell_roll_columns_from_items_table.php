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
            $table->dropColumn([
                'default_spell_level',
                'default_spell_school',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->unsignedTinyInteger('default_spell_level')->nullable()->after('default_spell_roll_enabled');
            $table->enum('default_spell_school', [
                'abjuration',
                'conjuration',
                'divination',
                'enchantment',
                'evocation',
                'illusion',
                'necromancy',
                'transmutation',
            ])->nullable()->after('default_spell_level');
        });
    }
};
