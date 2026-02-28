<?php

use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rerolls a single shop line in place', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $shop = Shop::factory()->create();

    $oldItem = Item::factory()->create([
        'name' => 'Old Shop Item',
        'url' => 'https://example.test/old-item',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'item',
        'shop_enabled' => false,
        'pick_count' => 3,
        'default_spell_roll_enabled' => false,
    ]);

    $newItem = Item::factory()->create([
        'name' => 'New Shop Item',
        'url' => 'https://example.test/new-item',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'item',
        'shop_enabled' => true,
        'pick_count' => 1,
        'default_spell_roll_enabled' => false,
    ]);

    $shopItem = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $oldItem->id,
        'item_name' => $oldItem->name,
        'item_url' => $oldItem->url,
        'item_cost' => $oldItem->cost,
        'item_rarity' => $oldItem->rarity,
        'item_type' => $oldItem->type,
        'notes' => 'Temporary line note',
        'snapshot_custom' => true,
        'spell_id' => null,
        'spell_name' => null,
        'spell_url' => null,
        'spell_legacy_url' => null,
        'spell_level' => null,
        'spell_school' => null,
    ]);

    $originalRowId = $shopItem->id;

    $this->actingAs($admin)
        ->post(route('admin.shop-items.reroll', ['shopItem' => $shopItem->id]))
        ->assertRedirect();

    $shopItem->refresh();
    $oldItem->refresh();
    $newItem->refresh();

    expect($shopItem->id)->toBe($originalRowId)
        ->and($shopItem->item_id)->toBe($newItem->id)
        ->and($shopItem->item_name)->toBe($newItem->name)
        ->and($shopItem->item_url)->toBe($newItem->url)
        ->and($shopItem->item_cost)->toBe($newItem->cost)
        ->and($shopItem->item_rarity)->toBe($newItem->rarity)
        ->and($shopItem->item_type)->toBe($newItem->type)
        ->and($shopItem->notes)->toBeNull()
        ->and($shopItem->snapshot_custom)->toBeFalse();

    expect($oldItem->pick_count)->toBe(2)
        ->and($newItem->pick_count)->toBe(2);
});

it('returns an error when no eligible replacement exists for reroll', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $shop = Shop::factory()->create();

    $onlyItem = Item::factory()->create([
        'name' => 'Only Item',
        'rarity' => 'very_rare',
        'type' => 'item',
        'shop_enabled' => false,
    ]);

    $shopItem = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $onlyItem->id,
        'item_name' => $onlyItem->name,
        'item_url' => $onlyItem->url,
        'item_cost' => $onlyItem->cost,
        'item_rarity' => $onlyItem->rarity,
        'item_type' => $onlyItem->type,
        'snapshot_custom' => true,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.shop-items.reroll', ['shopItem' => $shopItem->id]))
        ->assertSessionHasErrors('shop_item');

    $shopItem->refresh();
    expect($shopItem->item_id)->toBe($onlyItem->id);
});
