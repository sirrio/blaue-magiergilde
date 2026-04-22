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
            $table->string('character_retirement_channel_id', 32)->nullable()->after('character_approval_channel_guild_id');
            $table->string('character_retirement_channel_name')->nullable()->after('character_retirement_channel_id');
            $table->string('character_retirement_channel_guild_id', 32)->nullable()->after('character_retirement_channel_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropColumn([
                'character_retirement_channel_id',
                'character_retirement_channel_name',
                'character_retirement_channel_guild_id',
            ]);
        });
    }
};
