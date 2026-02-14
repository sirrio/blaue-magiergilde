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
        Schema::table('characters', function (Blueprint $table) {
            $table->index(['user_id', 'position'], 'characters_user_id_position_index');
            $table->index(['deleted_at', 'name'], 'characters_deleted_at_name_index');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->index(['user_id', 'deleted_at', 'start_date'], 'games_user_id_deleted_at_start_date_index');
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->index(['character_id', 'deleted_at'], 'adventures_character_id_deleted_at_index');
        });

        Schema::table('downtimes', function (Blueprint $table) {
            $table->index(['character_id', 'deleted_at'], 'downtimes_character_id_deleted_at_index');
        });

        Schema::table('allies', function (Blueprint $table) {
            $table->index(['character_id', 'name'], 'allies_character_id_name_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropIndex('characters_user_id_position_index');
            $table->dropIndex('characters_deleted_at_name_index');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex('games_user_id_deleted_at_start_date_index');
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->dropIndex('adventures_character_id_deleted_at_index');
        });

        Schema::table('downtimes', function (Blueprint $table) {
            $table->dropIndex('downtimes_character_id_deleted_at_index');
        });

        Schema::table('allies', function (Blueprint $table) {
            $table->dropIndex('allies_character_id_name_index');
        });
    }
};
