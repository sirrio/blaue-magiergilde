<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('auction_settings', function (Blueprint $table) {
            $table->string('voice_channel_id')->nullable()->after('post_channel_is_thread');
            $table->string('voice_channel_name')->nullable()->after('voice_channel_id');
            $table->string('voice_channel_type')->nullable()->after('voice_channel_name');
            $table->string('voice_channel_guild_id')->nullable()->after('voice_channel_type');
            $table->boolean('voice_channel_is_thread')->nullable()->after('voice_channel_guild_id');
        });

        if (! Schema::hasTable('voice_settings')) {
            return;
        }

        $voiceSettings = DB::table('voice_settings')->first();
        if (! $voiceSettings) {
            return;
        }

        $auctionSettings = DB::table('auction_settings')->first();
        $settingsId = $auctionSettings?->id;
        if (! $settingsId) {
            $settingsId = DB::table('auction_settings')->insertGetId([
                'post_channel_is_thread' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('auction_settings')
            ->where('id', $settingsId)
            ->update([
                'voice_channel_id' => $voiceSettings->voice_channel_id,
                'voice_channel_name' => $voiceSettings->voice_channel_name,
                'voice_channel_type' => $voiceSettings->voice_channel_type,
                'voice_channel_guild_id' => $voiceSettings->voice_channel_guild_id,
                'voice_channel_is_thread' => $voiceSettings->voice_channel_is_thread,
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('auction_settings', function (Blueprint $table) {
            $table->dropColumn([
                'voice_channel_id',
                'voice_channel_name',
                'voice_channel_type',
                'voice_channel_guild_id',
                'voice_channel_is_thread',
            ]);
        });
    }
};
