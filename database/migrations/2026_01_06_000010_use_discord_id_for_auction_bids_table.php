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
        if (! Schema::hasColumn('auction_bids', 'bidder_discord_id')) {
            Schema::table('auction_bids', function (Blueprint $table) {
                $table->string('bidder_discord_id')->after('auction_item_id');
            });
        }

        if (Schema::hasColumn('auction_bids', 'bidder_name')) {
            DB::table('auction_bids')->update([
                'bidder_discord_id' => DB::raw('bidder_name'),
            ]);

            Schema::table('auction_bids', function (Blueprint $table) {
                $table->dropColumn('bidder_name');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('auction_bids', 'bidder_name')) {
            Schema::table('auction_bids', function (Blueprint $table) {
                $table->string('bidder_name')->after('auction_item_id');
            });
        }

        if (Schema::hasColumn('auction_bids', 'bidder_discord_id')) {
            DB::table('auction_bids')->update([
                'bidder_name' => DB::raw('bidder_discord_id'),
            ]);

            Schema::table('auction_bids', function (Blueprint $table) {
                $table->dropColumn('bidder_discord_id');
            });
        }
    }
};
