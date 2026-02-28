<?php

use App\Models\Item;
use App\Models\Source;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('ddb source resolver command writes import csv and json report for resolved items', function () {
    Http::preventStrayRequests();

    Source::factory()->create([
        'name' => "Xanathar's Guide to Everything",
        'shortcode' => 'XGE',
    ]);

    $item = Item::factory()->create([
        'name' => 'Clockwork Amulet',
        'type' => 'item',
        'rarity' => 'common',
        'cost' => '100 GP',
        'url' => 'https://www.dndbeyond.com/magic-items/27042-clockwork-amulet',
        'source_id' => null,
        'guild_enabled' => true,
        'shop_enabled' => false,
        'ruling_changed' => false,
        'ruling_note' => null,
    ]);

    Http::fake([
        'https://www.dndbeyond.com/magic-items/27042-clockwork-amulet' => Http::response(
            '<html><head><title>Xanathar\'s Guide to Everything - Marketplace - D&D Beyond</title></head><body></body></html>',
            200,
            ['Content-Type' => 'text/html']
        ),
    ]);

    $csvPath = storage_path('framework/testing/compendium-item-source-import.csv');
    $reportPath = storage_path('framework/testing/compendium-item-source-report.json');
    @unlink($csvPath);
    @unlink($reportPath);

    $this->artisan('compendium:resolve-item-sources-from-ddb', [
        '--output' => $csvPath,
        '--report' => $reportPath,
        '--timeout' => 5,
    ])
        ->expectsOutputToContain('D&D Beyond source resolver summary')
        ->expectsOutputToContain('processed_items=1')
        ->expectsOutputToContain('resolved_items=1')
        ->expectsOutputToContain('exported_rows=1')
        ->expectsOutputToContain('Import CSV written to')
        ->expectsOutputToContain('Report written to')
        ->assertSuccessful();

    expect(file_exists($csvPath))->toBeTrue()
        ->and(file_exists($reportPath))->toBeTrue()
        ->and($item->fresh()->source_id)->toBeNull();

    $csvContent = (string) file_get_contents($csvPath);
    expect($csvContent)
        ->toContain('name,type,rarity,cost,extra_cost_note,url,source_shortcode,guild_enabled,shop_enabled,ruling_changed,ruling_note')
        ->toContain('Clockwork Amulet')
        ->toContain('XGE');

    $report = json_decode((string) file_get_contents($reportPath), true);
    expect($report)->toBeArray()
        ->and($report['summary']['resolved_items'] ?? null)->toBe(1)
        ->and($report['results'][0]['item_id'] ?? null)->toBe($item->id)
        ->and($report['results'][0]['source_shortcode'] ?? null)->toBe('XGE')
        ->and($report['results'][0]['import_ready'] ?? null)->toBeTrue();
});

test('ddb source resolver command excludes duplicate-url items from export and reports the issue', function () {
    Http::preventStrayRequests();

    Source::factory()->create([
        'name' => "Xanathar's Guide to Everything",
        'shortcode' => 'XGE',
    ]);

    Item::factory()->create([
        'name' => 'Axe of the Galloping Headsman',
        'type' => 'item',
        'rarity' => 'rare',
        'url' => 'https://www.dndbeyond.com/magic-items/999-axe',
        'source_id' => null,
    ]);

    Item::factory()->create([
        'name' => 'Axe of the Galloping Headsman',
        'type' => 'item',
        'rarity' => 'rare',
        'url' => 'https://www.dndbeyond.com/magic-items/999-axe',
        'source_id' => null,
    ]);

    Http::fake([
        'https://www.dndbeyond.com/magic-items/999-axe' => Http::response(
            '<html><head><title>Xanathar\'s Guide to Everything - Marketplace - D&D Beyond</title></head><body></body></html>',
            200,
            ['Content-Type' => 'text/html']
        ),
    ]);

    $csvPath = storage_path('framework/testing/compendium-item-source-import-duplicates.csv');
    $reportPath = storage_path('framework/testing/compendium-item-source-report-duplicates.json');
    @unlink($csvPath);
    @unlink($reportPath);

    $this->artisan('compendium:resolve-item-sources-from-ddb', [
        '--output' => $csvPath,
        '--report' => $reportPath,
        '--timeout' => 5,
    ])
        ->expectsOutputToContain('resolved_items=2')
        ->expectsOutputToContain('exported_rows=0')
        ->expectsOutputToContain('ambiguous_import_items=2')
        ->assertSuccessful();

    Http::assertSentCount(1);

    $csvLines = array_values(array_filter(
        preg_split('/\r\n|\n|\r/', (string) file_get_contents($csvPath)) ?: [],
        static fn (string $line): bool => $line !== '',
    ));
    expect($csvLines)->toHaveCount(1);

    $report = json_decode((string) file_get_contents($reportPath), true);
    expect($report['results'][0]['status'] ?? null)->toBe('ambiguous_import')
        ->and($report['results'][0]['import_issue'] ?? null)->toBe('duplicate_url');
});
