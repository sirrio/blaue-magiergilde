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
        Schema::table('backstock_items', function (Blueprint $table) {
            $table->string('item_name')->nullable()->after('item_id');
            $table->string('item_url')->nullable()->after('item_name');
            $table->string('item_cost')->nullable()->after('item_url');
            $table->string('item_rarity')->nullable()->after('item_cost');
            $table->string('item_type')->nullable()->after('item_rarity');
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::statement(
                'UPDATE backstock_items '
                .'SET item_name = (SELECT name FROM items WHERE items.id = backstock_items.item_id), '
                .'item_url = (SELECT url FROM items WHERE items.id = backstock_items.item_id), '
                .'item_cost = (SELECT cost FROM items WHERE items.id = backstock_items.item_id), '
                .'item_rarity = (SELECT rarity FROM items WHERE items.id = backstock_items.item_id), '
                .'item_type = (SELECT type FROM items WHERE items.id = backstock_items.item_id) '
                .'WHERE item_name IS NULL'
            );
        } else {
            DB::statement(
                'UPDATE backstock_items bi '
                .'INNER JOIN items i ON i.id = bi.item_id '
                .'SET bi.item_name = i.name, '
                .'bi.item_url = i.url, '
                .'bi.item_cost = i.cost, '
                .'bi.item_rarity = i.rarity, '
                .'bi.item_type = i.type '
                .'WHERE bi.item_name IS NULL'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('backstock_items', function (Blueprint $table) {
            $table->dropColumn([
                'item_name',
                'item_url',
                'item_cost',
                'item_rarity',
                'item_type',
            ]);
        });
    }
};
