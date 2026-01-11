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
            $table->json('last_voice_bid_message_ids')->nullable()->after('last_post_message_ids');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('auction_settings', function (Blueprint $table) {
            $table->dropColumn('last_voice_bid_message_ids');
        });
    }
};
