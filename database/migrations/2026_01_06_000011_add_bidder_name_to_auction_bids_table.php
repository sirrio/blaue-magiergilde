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
        if (! Schema::hasColumn('auction_bids', 'bidder_name')) {
            Schema::table('auction_bids', function (Blueprint $table) {
                $table->string('bidder_name')->after('auction_item_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('auction_bids', 'bidder_name')) {
            Schema::table('auction_bids', function (Blueprint $table) {
                $table->dropColumn('bidder_name');
            });
        }
    }
};
