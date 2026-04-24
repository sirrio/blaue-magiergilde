<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn([
                'dm_bubbles',
                'dm_coins',
                'bubble_shop_spend',
                'bubble_shop_legacy_spend',
            ]);
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('progression_version_id');
            $table->dropColumn([
                'is_pseudo',
                'target_level',
                'target_bubbles',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->integer('dm_bubbles')->default(0);
            $table->integer('dm_coins')->default(0);
            $table->integer('bubble_shop_spend')->default(0);
            $table->integer('bubble_shop_legacy_spend')->nullable();
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->boolean('is_pseudo')->default(false);
            $table->unsignedTinyInteger('target_level')->nullable();
            $table->unsignedSmallInteger('target_bubbles')->nullable();
            $table->foreignId('progression_version_id')->nullable()->constrained('level_progression_versions');
        });
    }
};
