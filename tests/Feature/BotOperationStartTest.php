<?php

use App\Jobs\ProcessBotOperationJob;
use App\Models\Auction;
use App\Models\BotOperation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

it('starts a shop publish operation and queues processing', function () {
    Queue::fake();
    $admin = User::factory()->create(['is_admin' => true]);

    $response = $this->actingAs($admin)
        ->postJson(route('admin.shops.post'), [
            'channel_id' => '12345',
        ])
        ->assertAccepted()
        ->assertJsonPath('status', 'started')
        ->assertJsonPath('operation.resource', BotOperation::RESOURCE_SHOP)
        ->assertJsonPath('operation.action', BotOperation::ACTION_PUBLISH_DRAFT);

    $operationId = (int) $response->json('operation.id');
    expect($operationId)->toBeGreaterThan(0);

    $operation = BotOperation::query()->findOrFail($operationId);
    expect($operation->resource)->toBe(BotOperation::RESOURCE_SHOP)
        ->and($operation->action)->toBe(BotOperation::ACTION_PUBLISH_DRAFT)
        ->and($operation->status)->toBe(BotOperation::STATUS_PENDING);

    Queue::assertPushed(ProcessBotOperationJob::class, function (ProcessBotOperationJob $job) use ($operationId) {
        return $job->botOperationId === $operationId;
    });
});

it('starts a backstock post operation and queues processing', function () {
    Queue::fake();
    $admin = User::factory()->create(['is_admin' => true]);

    $response = $this->actingAs($admin)
        ->postJson(route('admin.backstock.post'), [
            'channel_id' => '12345',
        ])
        ->assertAccepted()
        ->assertJsonPath('status', 'started')
        ->assertJsonPath('operation.resource', BotOperation::RESOURCE_BACKSTOCK)
        ->assertJsonPath('operation.action', BotOperation::ACTION_POST_BACKSTOCK);

    $operationId = (int) $response->json('operation.id');
    expect($operationId)->toBeGreaterThan(0);

    $operation = BotOperation::query()->findOrFail($operationId);
    expect($operation->resource)->toBe(BotOperation::RESOURCE_BACKSTOCK)
        ->and($operation->action)->toBe(BotOperation::ACTION_POST_BACKSTOCK)
        ->and($operation->status)->toBe(BotOperation::STATUS_PENDING);

    Queue::assertPushed(ProcessBotOperationJob::class, function (ProcessBotOperationJob $job) use ($operationId) {
        return $job->botOperationId === $operationId;
    });
});

it('starts an auction post operation and queues processing', function () {
    Queue::fake();
    $admin = User::factory()->create(['is_admin' => true]);
    $auction = Auction::query()->create([
        'status' => 'open',
        'currency' => 'GP',
    ]);

    $response = $this->actingAs($admin)
        ->postJson(route('admin.auctions.post', ['auction' => $auction->id]), [
            'channel_id' => '12345',
        ])
        ->assertAccepted()
        ->assertJsonPath('status', 'started')
        ->assertJsonPath('operation.resource', BotOperation::RESOURCE_AUCTION)
        ->assertJsonPath('operation.resource_id', $auction->id)
        ->assertJsonPath('operation.action', BotOperation::ACTION_POST_AUCTION);

    $operationId = (int) $response->json('operation.id');
    expect($operationId)->toBeGreaterThan(0);

    $operation = BotOperation::query()->findOrFail($operationId);
    expect($operation->resource)->toBe(BotOperation::RESOURCE_AUCTION)
        ->and($operation->resource_id)->toBe($auction->id)
        ->and($operation->action)->toBe(BotOperation::ACTION_POST_AUCTION)
        ->and($operation->status)->toBe(BotOperation::STATUS_PENDING);

    Queue::assertPushed(ProcessBotOperationJob::class, function (ProcessBotOperationJob $job) use ($operationId) {
        return $job->botOperationId === $operationId;
    });
});
