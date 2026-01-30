<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('games_scan_interval_minutes')
                ->default(60)
                ->after('games_scan_years');
        });
    }

    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn('games_scan_interval_minutes');
        });
    }
};
