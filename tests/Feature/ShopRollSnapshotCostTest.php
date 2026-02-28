<?php

use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\ShopItem;
use App\Services\ShopRollService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('rolling a new shop draft stores resolved display cost in item snapshot', function () {
    $clubId = (int) MundaneItemVariant::query()
        ->where('slug', 'club')
        ->value('id');
    $daggerId = (int) MundaneItemVariant::query()
        ->where('slug', 'dagger')
        ->value('id');

    $item = Item::factory()->create([
        'name' => 'Snapshot Weapon',
        'rarity' => 'common',
        'type' => 'weapon',
        'cost' => '100 GP',
        'shop_enabled' => true,
        'pick_count' => 0,
    ]);
    $item->mundaneVariants()->sync([$clubId, $daggerId]);

    $shop = app(ShopRollService::class)->roll();

    $snapshot = ShopItem::query()
        ->where('shop_id', $shop->id)
        ->where('item_id', $item->id)
        ->first();

    expect($snapshot)->not->toBeNull()
        ->and($snapshot?->item_cost)->toContain('Weapon cost');
});
