<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->string('games_summary_message_id', 32)->nullable()->after('games_scan_interval_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn('games_summary_message_id');
        });
    }
};
