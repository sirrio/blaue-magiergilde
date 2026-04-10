<?php

use App\Models\Item;
use App\Models\MundaneItemVariant;
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
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,mundane_variant_slugs,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Potion of Healing,consumable,common,55 GP,,https://example.test/potion,PHB,,true,true,false,',
        'Bag of Holding,item,uncommon,,,https://example.test/bag,PHB,,true,true,false,',
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

test('item import treats a source-only assignment as an update and applies it', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Xanathar's Guide to Everything",
        'shortcode' => 'XGE',
    ]);

    $existing = Item::factory()->create([
        'name' => 'Clockwork Amulet',
        'type' => 'item',
        'rarity' => 'common',
        'cost' => '100 GP',
        'url' => 'https://www.dndbeyond.com/magic-items/27042-clockwork-amulet',
        'source_id' => null,
        'guild_enabled' => true,
        'shop_enabled' => true,
        'ruling_changed' => false,
        'ruling_note' => null,
    ]);

    $csv = implode("\n", [
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Clockwork Amulet,item,common,100 GP,,https://www.dndbeyond.com/magic-items/27042-clockwork-amulet,XGE,true,true,false,',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect((int) $preview->json('summary.updated_rows'))->toBe(1)
        ->and((int) $preview->json('summary.unchanged_rows'))->toBe(0)
        ->and($preview->json('row_samples.0.changes.source_id.from'))->toBeNull()
        ->and($preview->json('row_samples.0.changes.source_id.to'))->toBe($source->id);

    $apply = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $preview->json('preview_token'),
    ]);

    $apply->assertOk();
    expect((int) $apply->json('summary.updated_rows'))->toBe(1)
        ->and($existing->fresh()?->source_id)->toBe($source->id);
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

test('export download returns item csv content in import schema', function () {
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
        'extra_cost_note' => 'Component cost',
        'url' => 'https://example.test/items/potion-healing',
        'source_id' => $source->id,
        'guild_enabled' => true,
        'shop_enabled' => false,
        'ruling_changed' => true,
        'ruling_note' => 'Updated note',
    ]);

    $response = $this->actingAs($admin)->get(route('admin.settings.compendium.export', [
        'entity_type' => 'items',
    ]));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $content = $response->streamedContent();
    $lines = preg_split('/\r\n|\r|\n/', trim($content)) ?: [];
    $header = str_getcsv($lines[0] ?? '');
    $row = str_getcsv($lines[1] ?? '');

    expect($header)->toBe([
        'name', 'type', 'rarity', 'cost', 'extra_cost_note', 'url', 'source_shortcode', 'mundane_variant_slugs', 'guild_enabled', 'shop_enabled', 'ruling_changed', 'ruling_note',
    ]);
    expect($row)->toBe([
        'Potion of Healing',
        'consumable',
        'common',
        '50 GP',
        'Component cost',
        'https://example.test/items/potion-healing',
        'PHB',
        '',
        'true',
        'false',
        'true',
        'Updated note',
    ]);
});

test('export download returns spell csv content in import schema', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);
    Spell::factory()->create([
        'name' => 'Fireball',
        'spell_level' => 3,
        'spell_school' => 'evocation',
        'url' => 'https://example.test/spells/fireball',
        'legacy_url' => 'https://example.test/spells/legacy-fireball',
        'source_id' => $source->id,
        'guild_enabled' => false,
        'ruling_changed' => true,
        'ruling_note' => 'Needs review',
    ]);

    $response = $this->actingAs($admin)->get(route('admin.settings.compendium.export', [
        'entity_type' => 'spells',
    ]));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $content = $response->streamedContent();
    $lines = preg_split('/\r\n|\r|\n/', trim($content)) ?: [];
    $header = str_getcsv($lines[0] ?? '');
    $row = str_getcsv($lines[1] ?? '');

    expect($content)
        ->toContain('name,spell_level,spell_school,url,legacy_url,source_shortcode,guild_enabled,ruling_changed,ruling_note');

    expect($header)->toBe([
        'name', 'spell_level', 'spell_school', 'url', 'legacy_url', 'source_shortcode', 'guild_enabled', 'ruling_changed', 'ruling_note',
    ]);
    expect($row)->toBe([
        'Fireball',
        '3',
        'evocation',
        'https://example.test/spells/fireball',
        'https://example.test/spells/legacy-fireball',
        'PHB',
        'false',
        'true',
        'Needs review',
    ]);
});

test('item import and export include mundane variant slugs', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);
    $longsword = MundaneItemVariant::query()->where('slug', 'longsword')->firstOrFail();
    $warhammer = MundaneItemVariant::query()->where('slug', 'warhammer')->firstOrFail();

    $csv = implode("\n", [
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,mundane_variant_slugs,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Blade of Testing,weapon,rare,1000 GP,,https://example.test/blade,PHB,"longsword,warhammer",true,true,false,',
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();
    expect((int) $previewResponse->json('summary.new_rows'))->toBe(1);

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $previewResponse->json('preview_token'),
    ]);

    $applyResponse->assertOk();

    $item = Item::query()->where('name', 'Blade of Testing')->first();

    expect($item)->not->toBeNull()
        ->and($item?->mundaneVariants()->pluck('slug')->sort()->values()->all())
        ->toBe([$longsword->slug, $warhammer->slug]);

    $exportResponse = $this->actingAs($admin)->get(route('admin.settings.compendium.export', [
        'entity_type' => 'items',
    ]));

    $exportResponse->assertOk();

    $content = $exportResponse->streamedContent();

    expect($content)->toContain('mundane_variant_slugs');
    expect($content)->toContain('"longsword,warhammer"');
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
