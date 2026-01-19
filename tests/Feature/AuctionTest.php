<?php

use App\Models\Auction;
use App\Models\AuctionBid;
use App\Models\AuctionHiddenBid;
use App\Models\AuctionItem;
use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rejects bids above a hidden max', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'rarity' => 'common',
        'type' => 'item',
        'cost' => 100,
    ]);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'repair_current' => 100,
        'repair_max' => 1000,
        'remaining_auctions' => 3,
    ]);

    AuctionHiddenBid::query()->create([
        'auction_item_id' => $auctionItem->id,
        'bidder_discord_id' => '12345',
        'bidder_name' => 'Tester',
        'max_amount' => 100,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.auction-items.bids.store', ['auctionItem' => $auctionItem->id]), [
            'bidder_name' => 'Tester',
            'bidder_discord_id' => '12345',
            'amount' => 110,
        ])
        ->assertSessionHasErrors('amount');

    expect(AuctionBid::count())->toBe(0);
});

it('rolls over eligible items when closing an auction', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $carryItem = Item::factory()->create(['rarity' => 'common', 'type' => 'item']);
    $expiredItem = Item::factory()->create(['rarity' => 'common', 'type' => 'item']);
    $soldItem = Item::factory()->create(['rarity' => 'common', 'type' => 'item']);

    $carryAuctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $carryItem->id,
        'repair_current' => 100,
        'repair_max' => 1000,
        'remaining_auctions' => 2,
    ]);
    $expiredAuctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $expiredItem->id,
        'repair_current' => 100,
        'repair_max' => 1000,
        'remaining_auctions' => 1,
    ]);
    $soldAuctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $soldItem->id,
        'repair_current' => 100,
        'repair_max' => 1000,
        'remaining_auctions' => 3,
    ]);

    AuctionBid::query()->create([
        'auction_item_id' => $soldAuctionItem->id,
        'bidder_name' => 'Buyer',
        'bidder_discord_id' => '98765',
        'amount' => 100,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->patch("/admin/auctions/{$auction->id}", ['status' => 'closed'])
        ->assertRedirect();

    $auction->refresh();
    expect($auction->status)->toBe('closed');
    expect(Auction::count())->toBe(2);

    $newAuction = Auction::query()
        ->where('id', '!=', $auction->id)
        ->first();

    expect($newAuction)->not->toBeNull();
    expect($newAuction->status)->toBe('open');

    $rolledItems = $newAuction->auctionItems()->get();
    expect($rolledItems)->toHaveCount(1);
    expect($rolledItems->first()->item_id)->toBe($carryAuctionItem->item_id);
    expect($rolledItems->first()->remaining_auctions)->toBe(1);

    expect($newAuction->auctionItems()->where('item_id', $expiredItem->id)->exists())->toBeFalse();
    expect($newAuction->auctionItems()->where('item_id', $soldItem->id)->exists())->toBeFalse();
});
