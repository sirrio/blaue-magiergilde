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
        Schema::table('auction_items', function (Blueprint $table) {
            $table->dateTime('sold_at')->nullable()->index();
            $table->foreignId('sold_bid_id')->nullable()->constrained('auction_bids')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('auction_items', function (Blueprint $table) {
            $table->dropForeign(['sold_bid_id']);
            $table->dropColumn(['sold_at', 'sold_bid_id']);
        });
    }
};
