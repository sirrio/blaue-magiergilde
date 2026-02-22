<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->string('support_ticket_channel_id', 32)->nullable()->after('games_scan_interval_minutes');
            $table->string('support_ticket_channel_name', 255)->nullable()->after('support_ticket_channel_id');
            $table->string('support_ticket_channel_guild_id', 32)->nullable()->after('support_ticket_channel_name');
        });
    }

    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn([
                'support_ticket_channel_id',
                'support_ticket_channel_name',
                'support_ticket_channel_guild_id',
            ]);
        });
    }
};
