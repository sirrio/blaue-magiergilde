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
            $table->boolean('snapshot_custom')->default(false)->after('item_type');
        });

        Schema::table('item_shop', function (Blueprint $table) {
            $table->boolean('snapshot_custom')->default(false)->after('item_type');
        });

        Schema::table('backstock_items', function (Blueprint $table) {
            $table->boolean('snapshot_custom')->default(false)->after('item_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('auction_items', function (Blueprint $table) {
            $table->dropColumn('snapshot_custom');
        });

        Schema::table('item_shop', function (Blueprint $table) {
            $table->dropColumn('snapshot_custom');
        });

        Schema::table('backstock_items', function (Blueprint $table) {
            $table->dropColumn('snapshot_custom');
        });
    }
};
