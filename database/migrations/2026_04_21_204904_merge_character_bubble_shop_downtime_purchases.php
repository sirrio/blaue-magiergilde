<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now()->toDateTimeString();

        $totals = DB::table('character_bubble_shop_purchases')
            ->selectRaw('character_id, SUM(quantity) as quantity')
            ->whereIn('type', ['lt_downtime', 'ht_downtime'])
            ->groupBy('character_id')
            ->get();

        foreach ($totals as $total) {
            $existingDowntime = DB::table('character_bubble_shop_purchases')
                ->where('character_id', $total->character_id)
                ->where('type', 'downtime')
                ->value('quantity');

            DB::table('character_bubble_shop_purchases')->updateOrInsert(
                [
                    'character_id' => $total->character_id,
                    'type' => 'downtime',
                ],
                [
                    'quantity' => (int) $total->quantity + (int) ($existingDowntime ?? 0),
                    'details' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        DB::table('character_bubble_shop_purchases')
            ->whereIn('type', ['lt_downtime', 'ht_downtime'])
            ->delete();
    }

    public function down(): void
    {
        $now = now()->toDateTimeString();

        $downtimePurchases = DB::table('character_bubble_shop_purchases')
            ->select(['character_id', 'quantity'])
            ->where('type', 'downtime')
            ->get();

        foreach ($downtimePurchases as $purchase) {
            $quantity = (int) $purchase->quantity;
            $ltQuantity = min(15, $quantity);
            $htQuantity = min(30, max(0, $quantity - 15));

            if ($ltQuantity > 0) {
                DB::table('character_bubble_shop_purchases')->updateOrInsert(
                    [
                        'character_id' => $purchase->character_id,
                        'type' => 'lt_downtime',
                    ],
                    [
                        'quantity' => $ltQuantity,
                        'details' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            }

            if ($htQuantity > 0) {
                DB::table('character_bubble_shop_purchases')->updateOrInsert(
                    [
                        'character_id' => $purchase->character_id,
                        'type' => 'ht_downtime',
                    ],
                    [
                        'quantity' => $htQuantity,
                        'details' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            }
        }

        DB::table('character_bubble_shop_purchases')
            ->where('type', 'downtime')
            ->delete();
    }
};
