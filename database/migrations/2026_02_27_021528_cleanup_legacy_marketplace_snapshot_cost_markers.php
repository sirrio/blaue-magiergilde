<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('item_mundane_variant') && Schema::hasTable('items')) {
            DB::table('item_mundane_variant')
                ->join('items', 'items.id', '=', 'item_mundane_variant.item_id')
                ->whereNotIn('items.type', ['weapon', 'armor'])
                ->delete();
        }

        $this->normalizeSnapshotCostMarkers('item_shop');
        $this->normalizeSnapshotCostMarkers('auction_items');
        $this->normalizeSnapshotCostMarkers('backstock_items');
    }

    public function down(): void
    {
        // Intentionally irreversible cleanup migration.
    }

    private function normalizeSnapshotCostMarkers(string $table): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        DB::table($table)
            ->whereNotNull('item_cost')
            ->where('item_cost', 'like', '%Componentpreis%')
            ->update([
                'item_cost' => DB::raw("REPLACE(item_cost, 'Componentpreis', 'Component cost')"),
            ]);

        DB::table($table)
            ->whereNotNull('item_cost')
            ->where('item_cost', 'like', '%Komponentenpreis%')
            ->update([
                'item_cost' => DB::raw("REPLACE(item_cost, 'Komponentenpreis', 'Component cost')"),
            ]);

        DB::table($table)
            ->whereNotNull('item_cost')
            ->where('item_cost', 'like', '%Waffenpreis%')
            ->update([
                'item_cost' => DB::raw("REPLACE(item_cost, 'Waffenpreis', 'Weapon base: Any weapon')"),
            ]);

        DB::table($table)
            ->whereNotNull('item_cost')
            ->where('item_cost', 'like', '%Rüstungspreis%')
            ->update([
                'item_cost' => DB::raw("REPLACE(item_cost, 'Rüstungspreis', 'Armor base: Any armor')"),
            ]);

        DB::table($table)
            ->whereNotNull('item_cost')
            ->where('item_cost', 'like', '%Ruestungspreis%')
            ->update([
                'item_cost' => DB::raw("REPLACE(item_cost, 'Ruestungspreis', 'Armor base: Any armor')"),
            ]);

        DB::table($table)
            ->whereNotNull('item_cost')
            ->where('item_cost', 'like', '%ruestungspreis%')
            ->update([
                'item_cost' => DB::raw("REPLACE(item_cost, 'ruestungspreis', 'Armor base: Any armor')"),
            ]);
    }
};
