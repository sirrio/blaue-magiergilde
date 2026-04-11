<?php

use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use App\Models\Spell;
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

it('keeps historical ruling snapshots stable when compendium rulings change', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Stable Item',
        'url' => 'https://example.test/stable-item',
        'cost' => '100 GP',
        'rarity' => 'rare',
        'type' => 'spellscroll',
        'ruling_changed' => false,
        'ruling_note' => null,
    ]);
    $spell = Spell::factory()->create([
        'name' => 'Old Spell',
        'ruling_changed' => false,
        'ruling_note' => null,
    ]);
    $shop = Shop::factory()->create();

    ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => $item->cost,
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'item_ruling_changed' => true,
        'item_ruling_note' => 'Old item snapshot ruling',
        'spell_id' => $spell->id,
        'spell_name' => $spell->name,
        'spell_url' => $spell->url,
        'spell_legacy_url' => $spell->legacy_url,
        'spell_level' => $spell->spell_level,
        'spell_school' => $spell->spell_school,
        'spell_ruling_changed' => true,
        'spell_ruling_note' => 'Old spell snapshot ruling',
        'snapshot_custom' => false,
    ]);

    $item->forceFill([
        'ruling_changed' => true,
        'ruling_note' => 'New compendium ruling',
    ])->save();
    $spell->forceFill([
        'ruling_changed' => true,
        'ruling_note' => 'New spell ruling',
    ])->save();

    $response = $this->actingAs($admin)->get(route('admin.shops.index'));

    $response->assertOk();
    $props = $response->viewData('page')['props'] ?? [];
    $shopPayload = collect($props['shops'] ?? [])->firstWhere('id', $shop->id);
    $shopItemPayload = collect($shopPayload['shop_items'] ?? [])->firstWhere('id', $shop->shopItems()->first()->id);

    expect($shopItemPayload)->not->toBeNull()
        ->and($shopItemPayload['item_ruling_changed'] ?? null)->toBeTrue()
        ->and($shopItemPayload['item_ruling_note'] ?? '__missing__')->toBe('Old item snapshot ruling')
        ->and($shopItemPayload['spell_ruling_changed'] ?? null)->toBeTrue()
        ->and($shopItemPayload['spell_ruling_note'] ?? '__missing__')->toBe('Old spell snapshot ruling');
});

it('refreshes item and spell ruling snapshots from the compendium', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Refreshable Item',
        'url' => 'https://example.test/refreshable-item',
        'cost' => '100 GP',
        'rarity' => 'rare',
        'type' => 'spellscroll',
        'ruling_changed' => true,
        'ruling_note' => 'Updated item ruling',
    ]);
    $spell = Spell::factory()->create([
        'name' => 'Refreshable Spell',
        'ruling_changed' => true,
        'ruling_note' => 'Updated spell ruling',
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
        'item_ruling_changed' => false,
        'item_ruling_note' => null,
        'spell_id' => $spell->id,
        'spell_name' => $spell->name,
        'spell_url' => $spell->url,
        'spell_legacy_url' => $spell->legacy_url,
        'spell_level' => $spell->spell_level,
        'spell_school' => $spell->spell_school,
        'spell_ruling_changed' => false,
        'spell_ruling_note' => null,
        'snapshot_custom' => true,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.shop-items.snapshot.refresh', ['shopItem' => $shopItem->id]))
        ->assertRedirect();

    $shopItem->refresh();
    expect($shopItem->item_ruling_changed)->toBeTrue()
        ->and($shopItem->item_ruling_note)->toBe('Updated item ruling')
        ->and($shopItem->spell_ruling_changed)->toBeTrue()
        ->and($shopItem->spell_ruling_note)->toBe('Updated spell ruling')
        ->and($shopItem->snapshot_custom)->toBeFalse();
});
