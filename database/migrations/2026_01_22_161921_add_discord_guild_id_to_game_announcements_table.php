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
        Schema::table('game_announcements', function (Blueprint $table) {
            $table->string('discord_guild_id')->nullable()->after('discord_channel_id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('game_announcements', function (Blueprint $table) {
            $table->dropColumn('discord_guild_id');
        });
    }
};
