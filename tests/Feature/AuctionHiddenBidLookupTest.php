<?php

use App\Models\Auction;
use App\Models\AuctionHiddenBid;
use App\Models\AuctionItem;
use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('stores hidden bid by discord id and resolves bidder name via bot lookup', function () {
    config()->set('services.bot.http_url', 'http://127.0.0.1:3125');
    config()->set('services.bot.http_token', 'test-token');
    config()->set('services.bot.guild_ids', '674631549207183370');

    Http::fake([
        'http://127.0.0.1:3125/discord-member-lookup' => Http::response([
            'status' => 'found',
            'guild_id' => '674631549207183370',
            'discord_user_id' => '22222',
            'display_name' => 'Resolved Name',
            'username' => 'resolved_username',
        ], 200),
    ]);

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

    $this->actingAs($admin)
        ->post(route('admin.auction-items.hidden-bids.store', ['auctionItem' => $auctionItem->id]), [
            'bidder_discord_id' => '22222',
            'max_amount' => 200,
        ])
        ->assertRedirect();

    $hiddenBid = AuctionHiddenBid::query()
        ->where('auction_item_id', $auctionItem->id)
        ->where('bidder_discord_id', '22222')
        ->first();

    expect($hiddenBid)->not->toBeNull()
        ->and($hiddenBid?->bidder_name)->toBe('Resolved Name')
        ->and($hiddenBid?->max_amount)->toBe(200);

    Http::assertSent(function (\Illuminate\Http\Client\Request $request): bool {
        $payload = $request->data();

        return $request->url() === 'http://127.0.0.1:3125/discord-member-lookup'
            && ($payload['discord_user_id'] ?? null) === '22222'
            && ($payload['guild_ids'][0] ?? null) === '674631549207183370';
    });
});

it('returns validation error when discord member lookup fails', function () {
    config()->set('services.bot.http_url', 'http://127.0.0.1:3125');
    config()->set('services.bot.http_token', 'test-token');

    Http::fake([
        'http://127.0.0.1:3125/discord-member-lookup' => Http::response([
            'error' => 'Discord member not found in configured guilds.',
        ], 404),
    ]);

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

    $this->actingAs($admin)
        ->post(route('admin.auction-items.hidden-bids.store', ['auctionItem' => $auctionItem->id]), [
            'bidder_discord_id' => '22222',
            'max_amount' => 200,
        ])
        ->assertSessionHasErrors('bidder_discord_id');

    expect(AuctionHiddenBid::query()->where('auction_item_id', $auctionItem->id)->count())->toBe(0);
});
