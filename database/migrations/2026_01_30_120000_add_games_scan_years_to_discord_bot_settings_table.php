<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('games_scan_years')
                ->default(10)
                ->after('games_channel_guild_id');
        });
    }

    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn('games_scan_years');
        });
    }
};
