<?php

use App\Models\Auction;
use App\Models\AuctionItem;
use App\Models\BackstockItem;
use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('keeps auction item snapshots stable when compendium items change', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Live Auction Item',
        'url' => 'https://example.test/live-auction-item',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'item',
    ]);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);

    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'item_name' => 'Historic Auction Snapshot',
        'item_url' => 'https://example.test/historic-auction-snapshot',
        'item_cost' => '250 GP',
        'item_rarity' => 'rare',
        'item_type' => 'consumable',
        'repair_current' => 5,
        'repair_max' => 50,
        'remaining_auctions' => 3,
        'snapshot_custom' => false,
    ]);

    $item->forceFill([
        'name' => 'New Live Item Name',
        'url' => 'https://example.test/new-live-item-name',
        'cost' => '999 GP',
        'rarity' => 'legendary',
        'type' => 'weapon',
    ])->save();

    $response = $this->actingAs($admin)->get(route('admin.auctions.index'));

    $response->assertOk();
    $props = $response->viewData('page')['props'] ?? [];
    $auctionPayload = collect($props['auctions'] ?? [])->firstWhere('id', $auction->id);
    $auctionItemPayload = collect($auctionPayload['auction_items'] ?? [])->firstWhere('id', $auctionItem->id);

    expect($auctionItemPayload)->not->toBeNull()
        ->and($auctionItemPayload['item_name'])->toBe('Historic Auction Snapshot')
        ->and($auctionItemPayload['item_url'])->toBe('https://example.test/historic-auction-snapshot')
        ->and($auctionItemPayload['item_cost'])->toBe('250 GP')
        ->and($auctionItemPayload['item_rarity'])->toBe('rare')
        ->and($auctionItemPayload['item_type'])->toBe('consumable')
        ->and($auctionItemPayload)->not->toHaveKey('item');
});

it('keeps backstock item snapshots stable when compendium items change', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Live Backstock Item',
        'url' => 'https://example.test/live-backstock-item',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'item',
    ]);

    $backstockItem = BackstockItem::query()->create([
        'item_id' => $item->id,
        'item_name' => 'Historic Backstock Snapshot',
        'item_url' => 'https://example.test/historic-backstock-snapshot',
        'item_cost' => '500 GP',
        'item_rarity' => 'very_rare',
        'item_type' => 'armor',
        'snapshot_custom' => false,
    ]);

    $item->forceFill([
        'name' => 'Changed Live Backstock Item',
        'url' => 'https://example.test/changed-live-backstock-item',
        'cost' => '999 GP',
        'rarity' => 'legendary',
        'type' => 'weapon',
    ])->save();

    $response = $this->actingAs($admin)->get(route('admin.backstock.index'));

    $response->assertOk();
    $props = $response->viewData('page')['props'] ?? [];
    $backstockItemPayload = collect($props['backstockItems'] ?? [])->firstWhere('id', $backstockItem->id);

    expect($backstockItemPayload)->not->toBeNull()
        ->and($backstockItemPayload['item_name'])->toBe('Historic Backstock Snapshot')
        ->and($backstockItemPayload['item_url'])->toBe('https://example.test/historic-backstock-snapshot')
        ->and($backstockItemPayload['item_cost'])->toBe('500 GP')
        ->and($backstockItemPayload['item_rarity'])->toBe('very_rare')
        ->and($backstockItemPayload['item_type'])->toBe('armor')
        ->and($backstockItemPayload)->not->toHaveKey('item');
});
