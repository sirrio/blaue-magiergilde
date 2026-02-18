<?php

use App\Models\Auction;
use App\Models\AuctionItem;
use App\Models\BackstockItem;
use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('updates a single posted shop line', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/shop-line-update' => Http::response(['status' => 'updated'], 200),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $shop = Shop::factory()->create();
    $item = Item::factory()->create();
    $shopItem = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
    ]);

    $this->actingAs($admin)
        ->postJson(route('admin.shop-items.update-post-line', ['shopItem' => $shopItem->id]))
        ->assertOk()
        ->assertJsonPath('status', 'updated');

    Http::assertSent(function ($request) use ($shopItem) {
        return $request->url() === 'http://bot.test/shop-line-update'
            && $request->hasHeader('X-Bot-Token', 'secret')
            && (int) $request['shop_item_id'] === $shopItem->id;
    });
});

it('updates a single posted auction line', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/auction-line-update' => Http::response(['status' => 'updated'], 200),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $auction = Auction::query()->create([
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $item = Item::factory()->create();
    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'remaining_auctions' => 3,
    ]);

    $this->actingAs($admin)
        ->postJson(route('admin.auction-items.update-post-line', ['auctionItem' => $auctionItem->id]))
        ->assertOk()
        ->assertJsonPath('status', 'updated');

    Http::assertSent(function ($request) use ($auctionItem) {
        return $request->url() === 'http://bot.test/auction-line-update'
            && $request->hasHeader('X-Bot-Token', 'secret')
            && (int) $request['auction_item_id'] === $auctionItem->id;
    });
});

it('updates a single posted backstock line', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/backstock-line-update' => Http::response(['status' => 'updated'], 200),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create();
    $backstockItem = BackstockItem::query()->create([
        'item_id' => $item->id,
    ]);

    $this->actingAs($admin)
        ->postJson(route('admin.backstock-items.update-post-line', ['backstockItem' => $backstockItem->id]))
        ->assertOk()
        ->assertJsonPath('status', 'updated');

    Http::assertSent(function ($request) use ($backstockItem) {
        return $request->url() === 'http://bot.test/backstock-line-update'
            && $request->hasHeader('X-Bot-Token', 'secret')
            && (int) $request['backstock_item_id'] === $backstockItem->id;
    });
});

it('returns bot errors when updating a posted line', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/shop-line-update' => Http::response(['error' => 'Last posted shop is #3.'], 409),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $shop = Shop::factory()->create();
    $item = Item::factory()->create();
    $shopItem = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
    ]);

    $this->actingAs($admin)
        ->postJson(route('admin.shop-items.update-post-line', ['shopItem' => $shopItem->id]))
        ->assertStatus(409)
        ->assertJsonPath('error', 'Bot request failed. (HTTP 409). Last posted shop is #3.');
});

it('requires admin access for line update endpoints', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create();
    $shop = Shop::factory()->create();
    $shopItem = ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
    ]);
    $auction = Auction::query()->create([
        'status' => 'open',
        'currency' => 'GP',
    ]);
    $auctionItem = AuctionItem::query()->create([
        'auction_id' => $auction->id,
        'item_id' => $item->id,
        'remaining_auctions' => 3,
    ]);
    $backstockItem = BackstockItem::query()->create([
        'item_id' => $item->id,
    ]);

    $this->actingAs($user)
        ->postJson(route('admin.shop-items.update-post-line', ['shopItem' => $shopItem->id]))
        ->assertForbidden();

    $this->actingAs($user)
        ->postJson(route('admin.auction-items.update-post-line', ['auctionItem' => $auctionItem->id]))
        ->assertForbidden();

    $this->actingAs($user)
        ->postJson(route('admin.backstock-items.update-post-line', ['backstockItem' => $backstockItem->id]))
        ->assertForbidden();
});
