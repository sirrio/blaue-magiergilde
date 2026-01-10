<?php

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('lets admins post a shop via the bot http endpoint', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/shop-post' => Http::response(['status' => 'posted'], 200),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $shop = Shop::factory()->create();

    $this->actingAs($admin)
        ->postJson("/admin/shops/{$shop->id}/post", [
            'channel_id' => '12345',
        ])
        ->assertOk()
        ->assertJsonPath('status', 'posted');

    Http::assertSent(function ($request) use ($shop) {
        return $request->url() === 'http://bot.test/shop-post'
            && $request->hasHeader('X-Bot-Token', 'secret')
            && $request['channel_id'] === '12345'
            && $request['shop_id'] === $shop->id;
    });
});

it('blocks non admins from posting shops', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $shop = Shop::factory()->create();

    $this->actingAs($user)
        ->postJson("/admin/shops/{$shop->id}/post", [
            'channel_id' => '12345',
        ])
        ->assertForbidden();
});
