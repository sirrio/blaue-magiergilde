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
        Schema::table('voice_settings', function (Blueprint $table) {
            $table->string('voice_channel_name')->nullable()->after('voice_channel_id');
            $table->string('voice_channel_type')->nullable()->after('voice_channel_name');
            $table->string('voice_channel_guild_id')->nullable()->after('voice_channel_type');
            $table->boolean('voice_channel_is_thread')->nullable()->after('voice_channel_guild_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('voice_settings', function (Blueprint $table) {
            $table->dropColumn([
                'voice_channel_name',
                'voice_channel_type',
                'voice_channel_guild_id',
                'voice_channel_is_thread',
            ]);
        });
    }
};
