<?php

use App\Models\Auction;
use App\Models\AuctionItem;
use App\Models\BackstockItem;
use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('migration normalizes legacy component notes and backfills non-custom snapshots', function () {
    $item = Item::factory()->create([
        'name' => 'Spell Scroll (1st Level)',
        'rarity' => 'common',
        'type' => 'spellscroll',
        'cost' => '50 GP + Componentpreis',
        'extra_cost_note' => null,
    ]);

    $shop = Shop::factory()->create();
    $shopSnapshot = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => '50 GP + Componentpreis',
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'snapshot_custom' => false,
    ]);
    $shopCustomSnapshot = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => '50 GP + Componentpreis',
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'snapshot_custom' => true,
    ]);

    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionSnapshot = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => '50 GP + Componentpreis',
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'snapshot_custom' => false,
    ]);

    $backstockSnapshot = BackstockItem::query()->create([
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => '50 GP + Componentpreis',
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'snapshot_custom' => false,
    ]);

    /** @var \Illuminate\Database\Migrations\Migration $migration */
    $migration = require database_path('migrations/2026_02_27_015234_normalize_item_cost_fields_and_backfill_snapshots.php');
    $migration->up();

    $item->refresh();
    $shopSnapshot->refresh();
    $shopCustomSnapshot->refresh();
    $auctionSnapshot->refresh();
    $backstockSnapshot->refresh();

    expect($item->cost)->toBe('50 GP')
        ->and($item->extra_cost_note)->toBe('Component cost');

    expect($shopSnapshot->item_cost)->toBe('50 GP + Component cost')
        ->and($auctionSnapshot->item_cost)->toBe('50 GP + Component cost')
        ->and($backstockSnapshot->item_cost)->toBe('50 GP + Component cost');

    expect($shopCustomSnapshot->item_cost)->toBe('50 GP + Componentpreis');
});
