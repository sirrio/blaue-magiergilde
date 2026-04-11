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
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,mundane_variant_slugs,default_spell_roll_enabled,default_spell_levels,default_spell_schools,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Potion of Healing,consumable,common,55 GP,,https://example.test/potion,PHB,,false,,,true,true,false,',
        'Bag of Holding,item,uncommon,,,https://example.test/bag,PHB,,false,,,true,true,false,',
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

test('item compendium preview accepts csv files with utf8 bom header', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    $csv = "\xEF\xBB\xBF".implode("\n", [
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,mundane_variant_slugs,default_spell_roll_enabled,default_spell_levels,default_spell_schools,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Potion of Healing,consumable,common,50 GP,,https://example.test/potion,PHB,,false,,,true,true,false,',
    ]);

    $response = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items-bom.csv', $csv),
    ], ['Accept' => 'application/json']);

    $response->assertOk();
    expect((int) $response->json('summary.invalid_rows'))->toBe(0)
        ->and((int) $response->json('summary.new_rows'))->toBe(1)
        ->and($response->json('error_samples'))->toBe([]);
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
        'name', 'type', 'rarity', 'cost', 'extra_cost_note', 'url', 'source_shortcode', 'mundane_variant_slugs', 'default_spell_roll_enabled', 'default_spell_levels', 'default_spell_schools', 'guild_enabled', 'shop_enabled', 'ruling_changed', 'ruling_note',
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
        'false',
        '',
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

test('admin can preview and apply source compendium import', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $existing = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
        'kind' => 'official',
    ]);

    $csv = implode("\n", [
        'shortcode,name,kind',
        'PHB,Players Handbook,official',
        'EXEB,Exploring Eberron,third_party',
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'sources',
        'file' => UploadedFile::fake()->createWithContent('sources.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();
    expect((int) $previewResponse->json('summary.total_rows'))->toBe(2)
        ->and((int) $previewResponse->json('summary.updated_rows'))->toBe(1)
        ->and((int) $previewResponse->json('summary.new_rows'))->toBe(1);

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $previewResponse->json('preview_token'),
    ]);

    $applyResponse->assertOk();

    expect($existing->fresh())
        ->name->toBe('Players Handbook')
        ->kind->toBe('official');

    $this->assertDatabaseHas('sources', [
        'shortcode' => 'EXEB',
        'name' => 'Exploring Eberron',
        'kind' => 'third_party',
    ]);
});

test('source compendium import keeps unchanged rows unchanged during apply', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
        'kind' => 'official',
    ]);

    $csv = implode("\n", [
        'shortcode,name,kind',
        'PHB,Player\'s Handbook,official',
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'sources',
        'file' => UploadedFile::fake()->createWithContent('sources.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();
    expect((int) $previewResponse->json('summary.unchanged_rows'))->toBe(1);

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $previewResponse->json('preview_token'),
    ]);

    $applyResponse->assertOk();
    expect((int) $applyResponse->json('summary.unchanged_rows'))->toBe(1);
});

test('source compendium import preview and apply can override missing rows', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $baselineCount = Source::query()->count();
    Source::factory()->create([
        'name' => 'Test Source One',
        'shortcode' => 'TST1',
        'kind' => 'official',
    ]);
    Source::factory()->create([
        'name' => 'Test Source Two',
        'shortcode' => 'TST2',
        'kind' => 'third_party',
    ]);

    $csv = implode("\n", [
        'shortcode,name,kind',
        'TST1,Test Source One,official',
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'sources',
        'override_missing' => '1',
        'file' => UploadedFile::fake()->createWithContent('sources.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();
    expect($previewResponse->json('override_missing'))->toBeTrue()
        ->and((int) $previewResponse->json('summary.deleted_rows'))->toBe($baselineCount + 1)
        ->and((int) $previewResponse->json('summary.unchanged_rows'))->toBe(1);

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $previewResponse->json('preview_token'),
    ]);

    $applyResponse->assertOk();
    expect((int) $applyResponse->json('summary.deleted_rows'))->toBe($baselineCount + 1);

    $this->assertDatabaseHas('sources', [
        'shortcode' => 'TST1',
    ]);
    $this->assertDatabaseMissing('sources', [
        'shortcode' => 'TST2',
    ]);
    $this->assertDatabaseHas('compendium_import_runs', [
        'entity_type' => 'sources',
        'filename' => 'sources.csv',
        'deleted_rows' => $baselineCount + 1,
    ]);
});

test('override compendium import cannot be applied while preview contains invalid rows', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $baselineCount = Source::query()->count();
    Source::factory()->create([
        'name' => 'Test Source One',
        'shortcode' => 'TST1',
        'kind' => 'official',
    ]);

    $csv = implode("\n", [
        'shortcode,name,kind',
        'PHB,Player\'s Handbook,official',
        'EXEB,Exploring Eberron,invalid-kind',
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'sources',
        'override_missing' => '1',
        'file' => UploadedFile::fake()->createWithContent('sources.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();
    expect((int) $previewResponse->json('summary.invalid_rows'))->toBe(1);

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $previewResponse->json('preview_token'),
    ]);

    $applyResponse->assertStatus(422)
        ->assertJson([
            'message' => 'Override import cannot be applied while invalid rows are present.',
        ]);

    $this->assertDatabaseHas('sources', [
        'shortcode' => 'TST1',
    ]);
    expect(Source::query()->count())->toBe($baselineCount + 1);
});

test('export download returns source csv content in import schema', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
        'kind' => 'official',
    ]);

    $response = $this->actingAs($admin)->get(route('admin.settings.compendium.export', [
        'entity_type' => 'sources',
    ]));

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $content = $response->streamedContent();
    $lines = preg_split('/\r\n|\r|\n/', trim($content)) ?: [];
    $header = str_getcsv($lines[0] ?? '');
    $rows = collect(array_slice($lines, 1))
        ->map(static fn (string $line): array => str_getcsv($line))
        ->values();

    expect($header)->toBe([
        'shortcode', 'name', 'kind',
    ]);
    expect($rows->contains([
        'PHB',
        "Player's Handbook",
        'official',
    ]))->toBeTrue();
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
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,mundane_variant_slugs,default_spell_roll_enabled,default_spell_levels,default_spell_schools,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Blade of Testing,weapon,rare,1000 GP,,https://example.test/blade,PHB,"longsword,warhammer",false,,,true,true,false,',
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

test('item import and export include default spell roll fields', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    $csv = implode("\n", [
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,mundane_variant_slugs,default_spell_roll_enabled,default_spell_levels,default_spell_schools,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        'Spell Bottle,item,rare,2500 GP,,https://example.test/spell-bottle,PHB,,true,"2,3","evocation,illusion",true,true,false,',
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $previewResponse->json('preview_token'),
    ]);

    $applyResponse->assertOk();

    $item = Item::query()->where('name', 'Spell Bottle')->first();

    expect($item)->not->toBeNull()
        ->and($item?->default_spell_roll_enabled)->toBeTrue()
        ->and($item?->default_spell_levels)->toBe([2, 3])
        ->and($item?->default_spell_schools)->toBe(['evocation', 'illusion']);

    $exportResponse = $this->actingAs($admin)->get(route('admin.settings.compendium.export', [
        'entity_type' => 'items',
    ]));

    $exportResponse->assertOk();

    $content = $exportResponse->streamedContent();

    expect($content)->toContain('default_spell_roll_enabled');
    expect($content)->toContain('"2,3"');
    expect($content)->toContain('"evocation,illusion"');
});

test('item export preserves spell level zero in default spell levels', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    Item::factory()->create([
        'name' => 'Enspelled Test Item',
        'type' => 'item',
        'rarity' => 'uncommon',
        'default_spell_roll_enabled' => true,
        'default_spell_levels' => [0, 1],
    ]);

    $exportResponse = $this->actingAs($admin)->get(route('admin.settings.compendium.export', [
        'entity_type' => 'items',
    ]));

    $exportResponse->assertOk();

    $content = $exportResponse->streamedContent();

    expect($content)->toContain('"0,1"');
});

test('override item compendium import soft deletes missing items and keeps shop snapshots intact', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    $keptItem = Item::factory()->create([
        'name' => 'Kept Item',
        'type' => 'item',
        'rarity' => 'common',
        'cost' => '100 GP',
        'source_id' => $source->id,
    ]);
    $removedItem = Item::factory()->create([
        'name' => 'Removed Item',
        'type' => 'item',
        'rarity' => 'common',
        'cost' => '100 GP',
        'source_id' => $source->id,
    ]);

    $shop = \App\Models\Shop::query()->create();
    $shopSnapshot = \App\Models\ShopItem::query()->create([
        'shop_id' => $shop->id,
        'item_id' => $removedItem->id,
        'item_name' => $removedItem->name,
        'item_url' => $removedItem->url,
        'item_cost' => $removedItem->cost,
        'item_rarity' => $removedItem->rarity,
        'item_type' => $removedItem->type,
        'snapshot_custom' => false,
    ]);

    $csv = implode("\n", [
        'name,type,rarity,cost,extra_cost_note,url,source_shortcode,mundane_variant_slugs,default_spell_roll_enabled,default_spell_levels,default_spell_schools,guild_enabled,shop_enabled,ruling_changed,ruling_note',
        "Kept Item,item,common,100 GP,,{$keptItem->url},PHB,,false,,,true,true,false,",
    ]);

    $previewResponse = $this->actingAs($admin)->post(route('admin.settings.compendium.preview'), [
        'entity_type' => 'items',
        'override_missing' => '1',
        'file' => UploadedFile::fake()->createWithContent('items.csv', $csv),
    ], ['Accept' => 'application/json']);

    $previewResponse->assertOk();
    expect((int) $previewResponse->json('summary.deleted_rows'))->toBeGreaterThanOrEqual(1);

    $applyResponse = $this->actingAs($admin)->postJson(route('admin.settings.compendium.apply'), [
        'preview_token' => (string) $previewResponse->json('preview_token'),
    ]);

    $applyResponse->assertOk();

    $this->assertSoftDeleted('items', [
        'id' => $removedItem->id,
    ]);
    $this->assertDatabaseHas('item_shop', [
        'id' => $shopSnapshot->id,
        'item_id' => $removedItem->id,
        'item_name' => 'Removed Item',
    ]);
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
