<?php

use App\Jobs\ProcessShopOperationJob;
use App\Models\Shop;
use App\Models\ShopOperation;
use App\Models\ShopSetting;
use App\Models\User;
use App\Services\ShopPostService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

use function Pest\Laravel\mock;

uses(RefreshDatabase::class);

it('lets admins start and complete publish-draft operation with pointer rotation', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/shop-post' => Http::response(['status' => 'posted'], 200),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $currentShop = Shop::factory()->create();
    $draftShop = Shop::factory()->create();
    ShopSetting::query()->create([
        'post_channel_id' => '12345',
        'current_shop_id' => $currentShop->id,
        'draft_shop_id' => $draftShop->id,
    ]);
    $beforeCount = Shop::query()->count();

    $response = $this->actingAs($admin)
        ->postJson('/admin/shops/publish-draft', [
            'channel_id' => '12345',
        ])
        ->assertAccepted()
        ->assertJsonPath('status', 'started');

    $operationId = (int) $response->json('operation.id');
    expect($operationId)->toBeGreaterThan(0);

    ProcessShopOperationJob::dispatchSync($operationId);

    Http::assertSent(function ($request) use ($draftShop) {
        return $request->url() === 'http://bot.test/shop-post'
            && $request->hasHeader('X-Bot-Token', 'secret')
            && $request['channel_id'] === '12345'
            && $request['shop_id'] === $draftShop->id;
    });

    $operation = ShopOperation::query()->findOrFail($operationId);
    expect($operation->status)->toBe(ShopOperation::STATUS_COMPLETED)
        ->and($operation->step)->toBe(ShopOperation::STATUS_COMPLETED)
        ->and($operation->result_shop_id)->toBe($draftShop->id)
        ->and($operation->current_shop_id)->toBe($draftShop->id)
        ->and($operation->draft_shop_id)->not->toBe($draftShop->id);

    $settings = ShopSetting::current();
    expect($settings->current_shop_id)->toBe($draftShop->id)
        ->and($settings->draft_shop_id)->toBe($operation->draft_shop_id)
        ->and(Shop::query()->whereKey($settings->draft_shop_id)->exists())->toBeTrue()
        ->and(Shop::query()->count())->toBe($beforeCount + 1);
});

it('blocks non admins from publishing draft shops', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->postJson('/admin/shops/publish-draft', [
            'channel_id' => '12345',
        ])
        ->assertForbidden();
});

it('marks publish operation as failed and does not rotate pointers when bot post fails', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/shop-post' => Http::response(['error' => 'failed'], 500),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $currentShop = Shop::factory()->create();
    $draftShop = Shop::factory()->create();
    ShopSetting::query()->create([
        'post_channel_id' => '12345',
        'current_shop_id' => $currentShop->id,
        'draft_shop_id' => $draftShop->id,
    ]);
    $beforeCount = Shop::query()->count();

    $response = $this->actingAs($admin)
        ->postJson('/admin/shops/publish-draft', [
            'channel_id' => '12345',
        ])
        ->assertAccepted();

    $operationId = (int) $response->json('operation.id');
    ProcessShopOperationJob::dispatchSync($operationId);

    $operation = ShopOperation::query()->findOrFail($operationId);
    expect($operation->status)->toBe(ShopOperation::STATUS_FAILED)
        ->and($operation->step)->toBe(ShopOperation::STATUS_POSTING_TO_DISCORD)
        ->and($operation->error)->toContain('failed');

    $settings = ShopSetting::current();
    expect($settings->current_shop_id)->toBe($currentShop->id)
        ->and($settings->draft_shop_id)->toBe($draftShop->id)
        ->and(Shop::query()->count())->toBe($beforeCount);
});

it('uses draft publish flow for the weekly command and marks auto post timestamp', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/shop-post' => Http::response(['status' => 'posted'], 200),
    ]);

    $currentShop = Shop::factory()->create();
    $draftShop = Shop::factory()->create();
    ShopSetting::query()->create([
        'post_channel_id' => '12345',
        'current_shop_id' => $currentShop->id,
        'draft_shop_id' => $draftShop->id,
    ]);
    $beforeCount = Shop::query()->count();

    $this->artisan('shop:post-weekly')->assertExitCode(0);

    Http::assertSent(function ($request) use ($draftShop) {
        return $request->url() === 'http://bot.test/shop-post'
            && $request['channel_id'] === '12345'
            && $request['shop_id'] === $draftShop->id;
    });

    $settings = ShopSetting::current();
    expect($settings->current_shop_id)->toBe($draftShop->id)
        ->and($settings->draft_shop_id)->not->toBe($draftShop->id)
        ->and($settings->last_auto_posted_at)->not->toBeNull()
        ->and(Shop::query()->count())->toBe($beforeCount + 1);
});

it('replaces stale draft pointers before publish operation runs', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    Http::fake([
        'http://bot.test/shop-post' => Http::response(['status' => 'posted'], 200),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $staleDraftShop = Shop::factory()->create();
    $currentShop = Shop::factory()->create();
    ShopSetting::query()->create([
        'post_channel_id' => '12345',
        'current_shop_id' => $currentShop->id,
        'draft_shop_id' => $staleDraftShop->id,
    ]);
    $beforeCount = Shop::query()->count();

    $response = $this->actingAs($admin)
        ->postJson('/admin/shops/publish-draft', [
            'channel_id' => '12345',
        ])
        ->assertAccepted();

    $operationId = (int) $response->json('operation.id');
    ProcessShopOperationJob::dispatchSync($operationId);

    $operation = ShopOperation::query()->findOrFail($operationId);
    $postedShopId = (int) $operation->result_shop_id;
    expect($postedShopId)->not->toBe($staleDraftShop->id)
        ->and($postedShopId)->not->toBe($currentShop->id)
        ->and($operation->status)->toBe(ShopOperation::STATUS_COMPLETED);

    Http::assertSent(function ($request) use ($postedShopId) {
        return $request->url() === 'http://bot.test/shop-post'
            && $request['channel_id'] === '12345'
            && (int) $request['shop_id'] === $postedShopId;
    });

    $settings = ShopSetting::current();
    expect($settings->current_shop_id)->toBe($postedShopId)
        ->and($settings->draft_shop_id)->not->toBe($postedShopId)
        ->and(Shop::query()->count())->toBe($beforeCount + 2);
});

it('rolls a new draft and updates the draft pointer from the admin action', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $currentShop = Shop::factory()->create();
    $draftShop = Shop::factory()->create();
    ShopSetting::query()->create([
        'post_channel_id' => '12345',
        'current_shop_id' => $currentShop->id,
        'draft_shop_id' => $draftShop->id,
    ]);
    $beforeCount = Shop::query()->count();

    $this->actingAs($admin)
        ->post(route('admin.shops.store'))
        ->assertRedirect();

    $settings = ShopSetting::current();
    expect($settings->current_shop_id)->toBe($currentShop->id)
        ->and($settings->draft_shop_id)->not->toBe($draftShop->id)
        ->and(Shop::query()->whereKey($settings->draft_shop_id)->exists())->toBeTrue()
        ->and(Shop::query()->count())->toBe($beforeCount + 1);
});

it('recovers from timeout when bot post state confirms draft was posted', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $currentShop = Shop::factory()->create();
    $draftShop = Shop::factory()->create();
    ShopSetting::query()->create([
        'post_channel_id' => '12345',
        'current_shop_id' => $currentShop->id,
        'draft_shop_id' => $draftShop->id,
        'last_post_message_ids' => ['shop_id' => $draftShop->id],
    ]);
    $beforeCount = Shop::query()->count();

    $service = mock(ShopPostService::class);
    $service->shouldReceive('post')
        ->once()
        ->andReturn([
            'ok' => false,
            'status' => 503,
            'error' => 'Bot is not reachable. cURL error 28: Operation timed out',
            'timed_out' => true,
        ]);

    $response = $this->actingAs($admin)
        ->postJson('/admin/shops/publish-draft', [
            'channel_id' => '12345',
        ])
        ->assertAccepted();

    $operationId = (int) $response->json('operation.id');
    ProcessShopOperationJob::dispatchSync($operationId);

    $operation = ShopOperation::query()->findOrFail($operationId);
    expect($operation->status)->toBe(ShopOperation::STATUS_COMPLETED)
        ->and($operation->result_shop_id)->toBe($draftShop->id);

    $settings = ShopSetting::current();
    expect($settings->current_shop_id)->toBe($draftShop->id)
        ->and($settings->draft_shop_id)->not->toBe($draftShop->id)
        ->and(Shop::query()->whereKey($settings->draft_shop_id)->exists())->toBeTrue()
        ->and(Shop::query()->count())->toBe($beforeCount + 1);
});

it('returns shop operation status for polling', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $operation = ShopOperation::query()->create([
        'action' => ShopOperation::ACTION_PUBLISH_DRAFT,
        'status' => ShopOperation::STATUS_POSTING_TO_DISCORD,
        'step' => ShopOperation::STATUS_POSTING_TO_DISCORD,
        'user_id' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->getJson(route('admin.shops.operations.show', ['shopOperation' => $operation->id]))
        ->assertOk()
        ->assertJsonPath('operation.id', $operation->id)
        ->assertJsonPath('operation.action', ShopOperation::ACTION_PUBLISH_DRAFT)
        ->assertJsonPath('operation.status', ShopOperation::STATUS_POSTING_TO_DISCORD);
});
