<?php

use App\Models\Item;
use App\Models\Source;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('item source audit command reports summary and writes json report', function () {
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    Item::factory()->create([
        'name' => 'Unsourced One',
        'type' => 'item',
        'url' => 'https://example.test/items/duplicate',
        'source_id' => null,
    ]);

    Item::factory()->create([
        'name' => 'Unsourced Two',
        'type' => 'item',
        'url' => 'https://example.test/items/duplicate',
        'source_id' => null,
    ]);

    Item::factory()->create([
        'name' => 'Sourced One',
        'type' => 'item',
        'url' => 'https://example.test/items/unique',
        'source_id' => $source->id,
    ]);

    $reportPath = storage_path('framework/testing/compendium-item-source-audit.json');
    @unlink($reportPath);

    $this->artisan('compendium:audit-item-sources', [
        '--sample' => 5,
        '--report' => $reportPath,
    ])
        ->expectsOutputToContain('Item source audit summary')
        ->expectsOutputToContain('total_items=3')
        ->expectsOutputToContain('items_without_source=2')
        ->expectsOutputToContain('duplicate_url_groups=1')
        ->expectsOutputToContain('Report written to')
        ->assertSuccessful();

    expect(file_exists($reportPath))->toBeTrue();

    $report = json_decode((string) file_get_contents($reportPath), true);

    expect($report)->toBeArray()
        ->and($report['audit']['summary']['total_items'] ?? null)->toBe(3)
        ->and($report['audit']['summary']['items_without_source'] ?? null)->toBe(2)
        ->and($report['audit']['summary']['duplicate_url_groups'] ?? null)->toBe(1);
});

test('item source audit mapping stays dry run unless apply is passed', function () {
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    $item = Item::factory()->create([
        'name' => 'Clockwork Amulet',
        'type' => 'item',
        'url' => 'https://example.test/items/clockwork-amulet',
        'source_id' => null,
    ]);

    $mappingPath = storage_path('framework/testing/compendium-item-source-mapping.csv');
    file_put_contents($mappingPath, implode("\n", [
        'url,source_shortcode',
        'https://example.test/items/clockwork-amulet,PHB',
        '',
    ]));

    $this->artisan('compendium:audit-item-sources', [
        '--mapping' => $mappingPath,
        '--sample' => 5,
    ])
        ->expectsOutputToContain('Mapping summary')
        ->expectsOutputToContain('matched_items=1')
        ->expectsOutputToContain('would_update_items=1')
        ->expectsOutputToContain('updated_items=0')
        ->assertSuccessful();

    expect($item->fresh()->source_id)->toBeNull();

    $this->artisan('compendium:audit-item-sources', [
        '--mapping' => $mappingPath,
        '--apply' => true,
        '--sample' => 5,
    ])
        ->expectsOutputToContain('Mapping summary')
        ->expectsOutputToContain('matched_items=1')
        ->expectsOutputToContain('updated_items=1')
        ->assertSuccessful();

    expect($item->fresh()->source_id)->toBe($source->id);
});
