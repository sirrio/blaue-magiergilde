<?php

use App\Models\Item;
use App\Models\Source;
use App\Models\Spell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

test('admin can preview and apply item compendium import', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);
    Item::factory()->create([
        'name' => 'Potion of Healing',
        'type' => 'consumable',
        'rarity' => 'common',
        'cost' => '50 GP',
        'source_id' => $source->id,
    ]);

    $csv = implode("\n", [
        'name,type,rarity,cost,url,source_shortcode,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Potion of Healing,consumable,common,55 GP,https://example.test/potion,PHB,true,true,false,',
        'Bag of Holding,item,uncommon,,https://example.test/bag,PHB,true,true,false,',
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();
    $token = (string) $previewResponse->json('preview_token');

    expect($token)->not->toBe('');
    expect((int) $previewResponse->json('summary.total_rows'))->toBe(2);
    expect((int) $previewResponse->json('summary.updated_rows'))->toBe(1);
    expect((int) $previewResponse->json('summary.new_rows'))->toBe(1);

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => $token,
    ]);

    $applyResponse->assertOk();
    expect((int) $applyResponse->json('summary.total_rows'))->toBe(2);

    $updated = Item::query()
        ->where('name', 'Potion of Healing')
        ->where('type', 'consumable')
        ->where('source_id', $source->id)
        ->first();

    $created = Item::query()
        ->where('name', 'Bag of Holding')
        ->where('type', 'item')
        ->where('source_id', $source->id)
        ->first();

    expect($updated)->not->toBeNull()
        ->and($updated?->cost)->toBe('55 GP')
        ->and($updated?->url)->toBe('https://example.test/potion');

    expect($created)->not->toBeNull()
        ->and($created?->rarity)->toBe('uncommon');

    $this->assertDatabaseHas('compendium_import_runs', [
        'entity_type' => 'items',
        'filename' => 'items.csv',
        'total_rows' => 2,
        'new_rows' => 1,
        'updated_rows' => 1,
        'invalid_rows' => 0,
    ]);
});

test('preview flags invalid spell rows with unknown source', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $csv = implode("\n", [
        'name,spell_level,spell_school,url,legacy_url,source_shortcode,guild_enabled,ruling_changed,ruling_note',
        'Fireball,3,evocation,https://example.test/fireball,,UNKNOWN,true,false,',
    ]);

    $response = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'spells',
        'file' => UploadedFile::fake()->createWithContent('spells.csv', $csv),
    ], ['Accept' => 'application/json']);

    $response->assertOk();
    expect((int) $response->json('summary.invalid_rows'))->toBe(1);
    expect(Spell::query()->count())->toBe(0);
});

test('item import updates existing unsourced rows instead of creating duplicates', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    $existing = Item::factory()->create([
        'name' => 'Potion of Healing',
        'type' => 'consumable',
        'rarity' => 'common',
        'cost' => '50 GP',
        'source_id' => null,
    ]);

    $csv = implode("\n", [
        'name,type,rarity,cost,url,source_shortcode,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Potion of Healing,consumable,common,60 GP,https://example.test/potion-new,PHB,true,true,false,',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect((int) $preview->json('summary.updated_rows'))->toBe(1)
        ->and((int) $preview->json('summary.new_rows'))->toBe(0);

    $token = (string) $preview->json('preview_token');

    $apply = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => $token,
    ]);

    $apply->assertOk();

    expect(Item::query()->count())->toBe(1);
    expect($existing->fresh())
        ->source_id->toBe($source->id)
        ->cost->toBe('60 GP')
        ->url->toBe('https://example.test/potion-new');
});

test('item import matches existing unsourced rows by unique url before falling back to name and type', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Xanathar's Guide to Everything",
        'shortcode' => 'XGE',
    ]);

    Item::factory()->create([
        'name' => 'Master Sword',
        'type' => 'item',
        'rarity' => 'rare',
        'cost' => '5000 GP',
        'url' => 'https://example.test/items/master-sword-a',
        'source_id' => null,
    ]);

    $target = Item::factory()->create([
        'name' => 'Master Sword',
        'type' => 'item',
        'rarity' => 'rare',
        'cost' => '5000 GP',
        'url' => 'https://example.test/items/master-sword-b',
        'source_id' => null,
    ]);

    $csv = implode("\n", [
        'name,type,rarity,cost,url,source_shortcode,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Master Sword,item,rare,5500 GP,https://example.test/items/master-sword-b,XGE,true,true,false,',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect((int) $preview->json('summary.updated_rows'))->toBe(1)
        ->and((int) $preview->json('summary.new_rows'))->toBe(0);

    $apply = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $preview->json('preview_token'),
    ]);

    $apply->assertOk();

    expect(Item::query()->count())->toBe(2);
    expect($target->fresh())
        ->source_id->toBe($source->id)
        ->cost->toBe('5500 GP');
});

test('template download returns csv content for items', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $response = $this->actingAs($admin)->get(route('admin.settings.compendium.template', [
        'entity_type' => 'items',
    ]));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
    expect($response->streamedContent())->toContain('name,type,rarity,cost,extra_cost_note,url,source_shortcode');
});

test('non admin cannot preview compendium import', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $csv = "name,type,rarity\nPotion of Healing,consumable,common\n";

    $response = $this->actingAs($user)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ]);

    $response->assertForbidden();
});
