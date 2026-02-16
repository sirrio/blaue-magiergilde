<?php

use App\Models\Item;
use App\Models\Source;
use App\Models\Spell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can create and update sources from settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post(route('admin.settings.sources.store'), [
            'name' => "Player's Handbook",
            'shortcode' => 'phb',
        ])
        ->assertRedirect();

    $source = Source::query()->first();

    expect($source)->not->toBeNull()
        ->and($source?->shortcode)->toBe('PHB')
        ->and($source?->name)->toBe("Player's Handbook");

    $this->actingAs($admin)
        ->patch(route('admin.settings.sources.update', $source), [
            'name' => "Dungeon Master's Guide",
            'shortcode' => 'dmg',
        ])
        ->assertRedirect();

    expect($source->fresh())
        ->shortcode->toBe('DMG')
        ->name->toBe("Dungeon Master's Guide");
});

test('deleting a source nulls source references on items and spells', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create();
    $item = Item::factory()->create(['source_id' => $source->id]);
    $spell = Spell::factory()->create(['source_id' => $source->id]);

    $this->actingAs($admin)
        ->delete(route('admin.settings.sources.destroy', $source))
        ->assertRedirect();

    expect($item->fresh()->source_id)->toBeNull()
        ->and($spell->fresh()->source_id)->toBeNull();
});
