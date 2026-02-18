<?php

use App\Models\Auction;
use App\Models\AuctionBid;
use App\Models\AuctionHiddenBid;
use App\Models\AuctionItem;
use App\Models\AuctionSetting;
use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('exposes auction post state fields in inertia settings payload', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    AuctionSetting::query()->create([
        'post_channel_id' => '12345',
        'last_post_channel_id' => '67890',
        'last_post_item_message_ids' => ['1' => '999'],
    ]);

    $this->actingAs($admin)
        ->get(route('admin.auctions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('auctionSettings.last_post_channel_id', '67890')
            ->where('auctionSettings.last_post_item_message_ids.1', '999')
        );
});

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

it('rejects bids for sold auction items', function () {
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
    $winningBid = AuctionBid::query()->create([
        'auction_item_id' => $auctionItem->id,
        'bidder_name' => 'Winner',
        'bidder_discord_id' => '11111',
        'amount' => 80,
        'created_by' => $admin->id,
    ]);

    $auctionItem->forceFill([
        'sold_at' => now(),
        'sold_bid_id' => $winningBid->id,
    ])->save();

    $this->actingAs($admin)
        ->post(route('admin.auction-items.bids.store', ['auctionItem' => $auctionItem->id]), [
            'bidder_name' => 'Late Bidder',
            'bidder_discord_id' => '22222',
            'amount' => 90,
        ])
        ->assertSessionHasErrors('auction_item');

    expect(AuctionBid::query()->where('auction_item_id', $auctionItem->id)->count())->toBe(1);
});

it('rejects hidden bids for sold auction items', function () {
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
    $winningBid = AuctionBid::query()->create([
        'auction_item_id' => $auctionItem->id,
        'bidder_name' => 'Winner',
        'bidder_discord_id' => '11111',
        'amount' => 80,
        'created_by' => $admin->id,
    ]);

    $auctionItem->forceFill([
        'sold_at' => now(),
        'sold_bid_id' => $winningBid->id,
    ])->save();

    $this->actingAs($admin)
        ->post(route('admin.auction-items.hidden-bids.store', ['auctionItem' => $auctionItem->id]), [
            'bidder_name' => 'Late Hidden Bidder',
            'bidder_discord_id' => '22222',
            'max_amount' => 200,
        ])
        ->assertSessionHasErrors('auction_item');

    expect(AuctionHiddenBid::query()->where('auction_item_id', $auctionItem->id)->count())->toBe(0);
});

it('deletes an auction line and cascades related bids', function () {
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

    AuctionBid::query()->create([
        'auction_item_id' => $auctionItem->id,
        'bidder_name' => 'Bidder',
        'bidder_discord_id' => '11111',
        'amount' => 90,
        'created_by' => $admin->id,
    ]);

    AuctionHiddenBid::query()->create([
        'auction_item_id' => $auctionItem->id,
        'bidder_discord_id' => '22222',
        'bidder_name' => 'Hidden Bidder',
        'max_amount' => 120,
    ]);

    $this->actingAs($admin)
        ->delete(route('admin.auction-items.destroy', ['auctionItem' => $auctionItem->id]))
        ->assertRedirect();

    expect(AuctionItem::query()->whereKey($auctionItem->id)->exists())->toBeFalse()
        ->and(AuctionBid::query()->where('auction_item_id', $auctionItem->id)->exists())->toBeFalse()
        ->and(AuctionHiddenBid::query()->where('auction_item_id', $auctionItem->id)->exists())->toBeFalse();
});

it('updates auction snapshot including auction specific repair values', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Brawler Ring',
        'rarity' => 'common',
        'type' => 'item',
        'cost' => '100 GP',
    ]);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => $item->cost,
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'repair_current' => 15,
        'repair_max' => 100,
        'remaining_auctions' => 3,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.auction-items.snapshot.update', ['auctionItem' => $auctionItem->id]), [
            'name' => 'Updated Brawler Ring',
            'url' => 'https://example.test/ring',
            'cost' => '250 GP',
            'notes' => 'Updated notes',
            'rarity' => 'rare',
            'type' => 'item',
            'repair_current' => 40,
            'repair_max' => 250,
        ])
        ->assertRedirect();

    $auctionItem->refresh();
    expect($auctionItem->item_name)->toBe('Updated Brawler Ring')
        ->and($auctionItem->item_url)->toBe('https://example.test/ring')
        ->and($auctionItem->item_cost)->toBe('250 GP')
        ->and($auctionItem->item_rarity)->toBe('rare')
        ->and($auctionItem->notes)->toBe('Updated notes')
        ->and($auctionItem->repair_current)->toBe(40)
        ->and($auctionItem->repair_max)->toBe(250)
        ->and($auctionItem->snapshot_custom)->toBeTrue();
});

it('does not mark snapshot custom when only auction line fields are changed', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Brawler Ring',
        'rarity' => 'common',
        'type' => 'item',
        'cost' => '100 GP',
    ]);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => $item->cost,
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'notes' => 'Old notes',
        'repair_current' => 15,
        'repair_max' => 100,
        'snapshot_custom' => false,
        'remaining_auctions' => 3,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.auction-items.snapshot.update', ['auctionItem' => $auctionItem->id]), [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'notes' => 'Only auction data changed',
            'rarity' => $item->rarity,
            'type' => $item->type,
            'repair_current' => 20,
            'repair_max' => 120,
        ])
        ->assertRedirect();

    $auctionItem->refresh();
    expect($auctionItem->notes)->toBe('Only auction data changed')
        ->and($auctionItem->repair_current)->toBe(20)
        ->and($auctionItem->repair_max)->toBe(120)
        ->and($auctionItem->snapshot_custom)->toBeFalse();
});

it('rejects repair max lower than current repair when updating auction snapshot', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'rarity' => 'common',
        'type' => 'item',
        'cost' => '100 GP',
    ]);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => $item->cost,
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'repair_current' => 20,
        'repair_max' => 100,
        'remaining_auctions' => 3,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.auction-items.snapshot.update', ['auctionItem' => $auctionItem->id]), [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'notes' => '',
            'rarity' => $item->rarity,
            'type' => $item->type,
            'repair_max' => 10,
        ])
        ->assertSessionHasErrors('repair_max');

    $auctionItem->refresh();
    expect($auctionItem->repair_max)->toBe(100);
});

it('rejects repair current above repair max when updating auction snapshot', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'rarity' => 'common',
        'type' => 'item',
        'cost' => '100 GP',
    ]);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'item_name' => $item->name,
        'item_url' => $item->url,
        'item_cost' => $item->cost,
        'item_rarity' => $item->rarity,
        'item_type' => $item->type,
        'repair_current' => 20,
        'repair_max' => 100,
        'remaining_auctions' => 3,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.auction-items.snapshot.update', ['auctionItem' => $auctionItem->id]), [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'notes' => '',
            'rarity' => $item->rarity,
            'type' => $item->type,
            'repair_current' => 250,
            'repair_max' => 100,
        ])
        ->assertSessionHasErrors('repair_current');

    $auctionItem->refresh();
    expect($auctionItem->repair_current)->toBe(20)
        ->and($auctionItem->repair_max)->toBe(100);
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

it('marks an auction item as sold and notifies the bot', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create(['rarity' => 'common', 'type' => 'item']);
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
    $bid = AuctionBid::query()->create([
        'auction_item_id' => $auctionItem->id,
        'bidder_name' => 'Winner',
        'bidder_discord_id' => '12345',
        'amount' => 250,
        'created_by' => $admin->id,
    ]);

    config()->set('services.bot.http_url', 'http://bot.test');
    config()->set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/auction-item-sold' => Http::response(['status' => 'updated'], 200),
    ]);

    $this->actingAs($admin)
        ->post(route('admin.auction-items.finalize', ['auctionItem' => $auctionItem->id]))
        ->assertRedirect();

    $auctionItem->refresh();
    expect($auctionItem->sold_at)->not->toBeNull()
        ->and($auctionItem->sold_bid_id)->toBe($bid->id);
});

it('marks an auction item as sold even when bot update fails', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create(['rarity' => 'common', 'type' => 'item']);
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
    $bid = AuctionBid::query()->create([
        'auction_item_id' => $auctionItem->id,
        'bidder_name' => 'Winner',
        'bidder_discord_id' => '12345',
        'amount' => 250,
        'created_by' => $admin->id,
    ]);

    config()->set('services.bot.http_url', 'http://bot.test');
    config()->set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/auction-item-sold' => Http::response(['error' => 'failed'], 500),
    ]);

    $this->actingAs($admin)
        ->post(route('admin.auction-items.finalize', ['auctionItem' => $auctionItem->id]))
        ->assertRedirect();

    $auctionItem->refresh();
    expect($auctionItem->sold_at)->not->toBeNull()
        ->and($auctionItem->sold_bid_id)->toBe($bid->id);
});

it('transfers non-winning hidden bids to the next unsold identical item when finalizing', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create(['rarity' => 'common', 'type' => 'item']);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);

    $soldItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'repair_current' => 100,
        'repair_max' => 1000,
        'remaining_auctions' => 3,
    ]);

    $nextItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'repair_current' => 90,
        'repair_max' => 1000,
        'remaining_auctions' => 2,
    ]);

    $winningBid = AuctionBid::query()->create([
        'auction_item_id' => $soldItem->id,
        'bidder_name' => 'Winner',
        'bidder_discord_id' => '12345',
        'amount' => 250,
        'created_by' => $admin->id,
    ]);

    AuctionHiddenBid::query()->create([
        'auction_item_id' => $soldItem->id,
        'bidder_discord_id' => '11111',
        'bidder_name' => 'Carry One',
        'max_amount' => 180,
    ]);

    AuctionHiddenBid::query()->create([
        'auction_item_id' => $soldItem->id,
        'bidder_discord_id' => '22222',
        'bidder_name' => 'Carry Two',
        'max_amount' => 160,
    ]);

    AuctionHiddenBid::query()->create([
        'auction_item_id' => $nextItem->id,
        'bidder_discord_id' => '11111',
        'bidder_name' => 'Carry One',
        'max_amount' => 140,
    ]);

    config()->set('services.bot.http_url', 'http://bot.test');
    config()->set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/auction-item-sold' => Http::response(['status' => 'updated'], 200),
    ]);

    $this->actingAs($admin)
        ->post(route('admin.auction-items.finalize', ['auctionItem' => $soldItem->id]))
        ->assertRedirect();

    $soldItem->refresh();
    expect($soldItem->sold_at)->not->toBeNull()
        ->and($soldItem->sold_bid_id)->toBe($winningBid->id);

    expect(AuctionHiddenBid::query()->where('auction_item_id', $soldItem->id)->count())->toBe(0);

    $transferredForFirstBidder = AuctionHiddenBid::query()
        ->where('auction_item_id', $nextItem->id)
        ->where('bidder_discord_id', '11111')
        ->first();
    $transferredForSecondBidder = AuctionHiddenBid::query()
        ->where('auction_item_id', $nextItem->id)
        ->where('bidder_discord_id', '22222')
        ->first();

    expect($transferredForFirstBidder)->not->toBeNull()
        ->and($transferredForFirstBidder?->max_amount)->toBe(180)
        ->and($transferredForSecondBidder)->not->toBeNull()
        ->and($transferredForSecondBidder?->max_amount)->toBe(160);
});

it('does not transfer hidden bids when there is no next unsold identical item', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create(['rarity' => 'common', 'type' => 'item']);
    $auction = Auction::query()->create([
        'title' => null,
        'status' => 'open',
        'currency' => 'GP',
    ]);

    $soldItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'repair_current' => 100,
        'repair_max' => 1000,
        'remaining_auctions' => 3,
    ]);

    $winningBid = AuctionBid::query()->create([
        'auction_item_id' => $soldItem->id,
        'bidder_name' => 'Winner',
        'bidder_discord_id' => '12345',
        'amount' => 250,
        'created_by' => $admin->id,
    ]);

    AuctionHiddenBid::query()->create([
        'auction_item_id' => $soldItem->id,
        'bidder_discord_id' => '11111',
        'bidder_name' => 'Carry One',
        'max_amount' => 180,
    ]);

    config()->set('services.bot.http_url', 'http://bot.test');
    config()->set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/auction-item-sold' => Http::response(['status' => 'updated'], 200),
    ]);

    $this->actingAs($admin)
        ->post(route('admin.auction-items.finalize', ['auctionItem' => $soldItem->id]))
        ->assertRedirect();

    $soldItem->refresh();
    expect($soldItem->sold_at)->not->toBeNull()
        ->and($soldItem->sold_bid_id)->toBe($winningBid->id);

    expect(AuctionHiddenBid::query()->where('auction_item_id', $soldItem->id)->count())->toBe(1);
});
