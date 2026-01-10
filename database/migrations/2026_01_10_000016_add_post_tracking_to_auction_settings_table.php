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
        Schema::table('auction_settings', function (Blueprint $table) {
            $table->string('last_post_channel_id')->nullable()->after('post_channel_is_thread');
            $table->json('last_post_message_ids')->nullable()->after('last_post_channel_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('auction_settings', function (Blueprint $table) {
            $table->dropColumn(['last_post_channel_id', 'last_post_message_ids']);
        });
    }
};
