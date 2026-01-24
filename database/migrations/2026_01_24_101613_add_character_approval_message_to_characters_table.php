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
        Schema::table('characters', function (Blueprint $table) {
            $table->string('approval_discord_channel_id', 32)->nullable()->after('external_link');
            $table->string('approval_discord_message_id', 32)->nullable()->after('approval_discord_channel_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn([
                'approval_discord_channel_id',
                'approval_discord_message_id',
            ]);
        });
    }
};
