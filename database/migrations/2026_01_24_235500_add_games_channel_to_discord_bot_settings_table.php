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
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->string('games_channel_id', 32)->nullable()->after('character_approval_channel_guild_id');
            $table->string('games_channel_name', 255)->nullable()->after('games_channel_id');
            $table->string('games_channel_guild_id', 32)->nullable()->after('games_channel_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn([
                'games_channel_id',
                'games_channel_name',
                'games_channel_guild_id',
            ]);
        });
    }
};
