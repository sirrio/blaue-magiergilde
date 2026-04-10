<?php

use App\Models\Auction;
use App\Models\AuctionItem;
use App\Models\BackstockItem;
use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('cleanup migration normalizes legacy snapshot markers and removes invalid variant links', function () {
    $weaponVariantId = (int) DB::table('mundane_item_variants')
        ->where('slug', 'any-weapon')
        ->value('id');

    $consumable = Item::factory()->create([
        'type' => 'consumable',
        'rarity' => 'uncommon',
        'cost' => '500 GP',
        'extra_cost_note' => null,
    ]);

    DB::table('item_mundane_variant')->insert([
        'item_id' => $consumable->id,
        'mundane_item_variant_id' => $weaponVariantId,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $shop = Shop::factory()->create();
    $shopSnapshot = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $consumable->id,
        'item_name' => $consumable->name,
        'item_cost' => '500 GP + Componentpreis',
        'snapshot_custom' => true,
    ]);

    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionSnapshot = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $consumable->id,
        'item_name' => $consumable->name,
        'item_cost' => '1000 GP + Waffenpreis',
        'snapshot_custom' => true,
    ]);

    $backstockSnapshot = BackstockItem::query()->create([
        'item_id' => $consumable->id,
        'item_name' => $consumable->name,
        'item_cost' => '1000 GP + Rüstungspreis',
        'snapshot_custom' => true,
    ]);

    /** @var \Illuminate\Database\Migrations\Migration $migration */
    $migration = require database_path('migrations/2026_02_27_021528_cleanup_legacy_marketplace_snapshot_cost_markers.php');
    $migration->up();
    $labelMigration = require database_path('migrations/2026_02_28_221228_normalize_marketplace_snapshot_variant_cost_labels.php');
    $labelMigration->up();

    $shopSnapshot->refresh();
    $auctionSnapshot->refresh();
    $backstockSnapshot->refresh();

    expect(DB::table('item_mundane_variant')->where('item_id', $consumable->id)->count())->toBe(0);

    expect($shopSnapshot->item_cost)->toBe('500 GP + Component cost');
    expect($auctionSnapshot->item_cost)->toBe('1000 GP + Weapon cost');
    expect($backstockSnapshot->item_cost)->toBe('1000 GP + Armor cost');
});
