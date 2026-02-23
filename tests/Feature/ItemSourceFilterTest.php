<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Item;
use App\Models\Source;
use App\Models\User;

test('items index filters by selected source', function () {
    $user = User::factory()->create();
    $inertiaVersion = app(HandleInertiaRequests::class)->version(request());
    $sourceA = Source::factory()->create(['shortcode' => 'SRCA']);
    $sourceB = Source::factory()->create(['shortcode' => 'SRCB']);

    $itemFromSourceA = Item::factory()->create([
        'name' => 'Source A Item',
        'source_id' => $sourceA->id,
    ]);
    $itemFromSourceB = Item::factory()->create([
        'name' => 'Source B Item',
        'source_id' => $sourceB->id,
    ]);

    $headers = [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Partial-Component' => 'item/index',
        'X-Inertia-Partial-Data' => 'items',
    ];
    if (is_string($inertiaVersion) && $inertiaVersion !== '') {
        $headers['X-Inertia-Version'] = $inertiaVersion;
    }

    $response = $this->actingAs($user)
        ->withHeaders($headers)
        ->get(route('compendium.items.index', ['source' => $sourceA->id]));

    $response->assertOk();

    $items = $response->json('props.items');
    $itemIds = collect($items)->pluck('id')->all();

    expect($itemIds)->toContain($itemFromSourceA->id)
        ->not->toContain($itemFromSourceB->id);
});

test('items index can filter entries without a source', function () {
    $user = User::factory()->create();
    $inertiaVersion = app(HandleInertiaRequests::class)->version(request());
    $source = Source::factory()->create(['shortcode' => 'SRCX']);

    $itemWithoutSource = Item::factory()->create([
        'name' => 'Unsourced Item',
        'source_id' => null,
    ]);
    $itemWithSource = Item::factory()->create([
        'name' => 'Sourced Item',
        'source_id' => $source->id,
    ]);

    $headers = [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Partial-Component' => 'item/index',
        'X-Inertia-Partial-Data' => 'items',
    ];
    if (is_string($inertiaVersion) && $inertiaVersion !== '') {
        $headers['X-Inertia-Version'] = $inertiaVersion;
    }

    $response = $this->actingAs($user)
        ->withHeaders($headers)
        ->get(route('compendium.items.index', ['source' => 'none']));

    $response->assertOk();

    $items = $response->json('props.items');
    $itemIds = collect($items)->pluck('id')->all();

    expect($itemIds)->toContain($itemWithoutSource->id)
        ->not->toContain($itemWithSource->id);
});
