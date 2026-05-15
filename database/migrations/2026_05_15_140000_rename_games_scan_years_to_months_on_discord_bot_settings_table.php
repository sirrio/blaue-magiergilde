<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('games_scan_months')
                ->default(3)
                ->after('games_channel_guild_id');
        });

        // Carry over existing values per-row (years × 12, capped at 24) and reset
        // any old default scan interval to the new 5-minute default. Done in PHP
        // so the migration stays portable across MySQL and SQLite.
        DB::table('discord_bot_settings')->orderBy('id')->each(function ($row): void {
            $years = (int) ($row->games_scan_years ?? 0);
            $months = max(1, min(24, $years * 12));
            $updates = ['games_scan_months' => $months];
            if ((int) ($row->games_scan_interval_minutes ?? 0) === 60) {
                $updates['games_scan_interval_minutes'] = 5;
            }
            DB::table('discord_bot_settings')->where('id', $row->id)->update($updates);
        });

        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn('games_scan_years');
        });
    }

    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('games_scan_years')
                ->default(10)
                ->after('games_channel_guild_id');
        });

        DB::table('discord_bot_settings')->orderBy('id')->each(function ($row): void {
            $months = (int) ($row->games_scan_months ?? 12);
            $years = max(1, (int) ceil($months / 12));
            DB::table('discord_bot_settings')->where('id', $row->id)->update([
                'games_scan_years' => $years,
            ]);
        });

        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn('games_scan_months');
        });
    }
};
