<?php

use App\Models\Item;
use App\Models\Source;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can assign source to item via update', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create(['source_id' => null]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    $payload = [
        'id' => $item->id,
        'name' => 'Arcane Focus',
        'url' => 'https://example.com/arcane-focus',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'item',
        'source_id' => $source->id,
        'shop_enabled' => true,
        'guild_enabled' => true,
        'default_spell_roll_enabled' => false,
        'ruling_changed' => false,
    ];

    $response = $this->actingAs($admin)->put(route('admin.items.update', $item), $payload);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($item->fresh())
        ->name->toBe('Arcane Focus')
        ->source_id->toBe($source->id);
});
