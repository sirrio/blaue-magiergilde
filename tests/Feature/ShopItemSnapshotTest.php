<?php

use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('marks shop line as custom when item snapshot fields are changed', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Original Item',
        'url' => 'https://example.test/original',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'item',
    ]);
    $shop = Shop::factory()->create();

    $shopItem = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => $item->cost,
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'notes' => null,
        'snapshot_custom' => false,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.shop-items.snapshot.update', ['shopItem' => $shopItem->id]), [
            'name' => 'Updated Item',
            'url' => 'https://example.test/updated',
            'cost' => '150 GP',
            'notes' => '',
            'rarity' => 'rare',
            'type' => 'item',
        ])
        ->assertRedirect();

    $shopItem->refresh();
    expect($shopItem->item_name)->toBe('Updated Item')
        ->and($shopItem->item_url)->toBe('https://example.test/updated')
        ->and($shopItem->item_cost)->toBe('150 GP')
        ->and($shopItem->item_rarity)->toBe('rare')
        ->and($shopItem->snapshot_custom)->toBeTrue();
});

it('does not mark shop line as custom when only listing notes are changed', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Original Item',
        'url' => 'https://example.test/original',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'item',
    ]);
    $shop = Shop::factory()->create();

    $shopItem = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => $item->cost,
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'notes' => 'Old note',
        'snapshot_custom' => false,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.shop-items.snapshot.update', ['shopItem' => $shopItem->id]), [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'notes' => 'New listing note',
            'rarity' => $item->rarity,
            'type' => $item->type,
        ])
        ->assertRedirect();

    $shopItem->refresh();
    expect($shopItem->notes)->toBe('New listing note')
        ->and($shopItem->snapshot_custom)->toBeFalse();
});
