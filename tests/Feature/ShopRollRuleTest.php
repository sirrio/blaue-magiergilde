<?php

use App\Models\Item;
use App\Models\ShopRollRule;
use App\Models\Source;
use App\Models\User;
use App\Services\ShopRollService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('lets admins update shop roll rules', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $response = $this->actingAs($admin)
        ->patchJson(route('admin.shop-settings.update'), [
            'roll_rules' => [
                [
                    'rarity' => 'common',
                    'selection_types' => ['weapon', 'armor', 'spellscroll'],
                    'source_kind' => 'official',
                    'section_title' => 'Common WotC Picks',
                    'count' => 2,
                    'sort_order' => 10,
                ],
                [
                    'rarity' => 'rare',
                    'selection_types' => ['consumable'],
                    'source_kind' => 'third_party',
                    'section_title' => 'Rare 3rd-party Consumables',
                    'count' => 1,
                    'sort_order' => 20,
                ],
            ],
        ]);

    $response->assertOk()
        ->assertJsonPath('shop_settings.roll_rules.0.source_kind', 'official')
        ->assertJsonPath('shop_settings.roll_rules.0.selection_types.0', 'weapon')
        ->assertJsonPath('shop_settings.roll_rules.0.selection_types.2', 'spellscroll')
        ->assertJsonPath('shop_settings.roll_rules.0.section_title', 'Common WotC Picks')
        ->assertJsonPath('shop_settings.roll_rules.0.count', 2)
        ->assertJsonPath('shop_settings.roll_rules.1.source_kind', 'third_party');

    expect(ShopRollRule::query()->count())->toBe(2)
        ->and(ShopRollRule::query()->orderBy('sort_order')->value('source_kind'))->toBe('official');
});

it('respects source kind rules when rolling a shop', function () {
    ShopRollRule::query()->delete();
    ShopRollRule::query()->create([
        'rarity' => 'common',
        'selection_types' => ['weapon', 'item'],
        'source_kind' => 'official',
        'section_title' => 'Official Common Gear',
        'count' => 1,
        'sort_order' => 10,
    ]);

    $officialSource = Source::factory()->create([
        'name' => 'Player Handbook',
        'shortcode' => 'PHB',
        'kind' => 'official',
    ]);
    $thirdPartySource = Source::factory()->create([
        'name' => 'Kobold Press',
        'shortcode' => 'KP',
        'kind' => 'third_party',
    ]);

    $officialItem = Item::factory()->create([
        'name' => 'Official Blade',
        'rarity' => 'common',
        'type' => 'item',
        'shop_enabled' => true,
        'pick_count' => 0,
        'source_id' => $officialSource->id,
    ]);
    Item::factory()->create([
        'name' => 'Third Party Blade',
        'rarity' => 'common',
        'type' => 'item',
        'shop_enabled' => true,
        'pick_count' => 0,
        'source_id' => $thirdPartySource->id,
    ]);

    $shop = app(ShopRollService::class)->roll();

    $rolledLine = $shop->shopItems()->first();

    expect($rolledLine)->not->toBeNull()
        ->and($rolledLine?->item_id)->toBe($officialItem->id)
        ->and($rolledLine?->roll_source_kind)->toBe('official')
        ->and($rolledLine?->roll_section_title)->toBe('Official Common Gear')
        ->and($rolledLine?->roll_sort_order)->toBe(10);
});

it('backfills shop rule sections for legacy databases', function () {
    $item = Item::factory()->create([
        'name' => 'Legacy Shop Item',
        'rarity' => 'common',
        'type' => 'item',
        'shop_enabled' => true,
    ]);

    Schema::table('shop_roll_rules', function ($table): void {
        $table->dropColumn('section_title');
    });

    Schema::table('item_shop', function ($table): void {
        $table->dropColumn(['roll_section_title', 'roll_sort_order']);
    });

    DB::table('shop_roll_rules')->insert([
        'rarity' => 'common',
        'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR),
        'source_kind' => 'all',
        'count' => 5,
        'sort_order' => 10,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('shops')->insert([
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('item_shop')->insert([
        'shop_id' => 1,
        'item_id' => $item->id,
        'item_name' => 'Legacy Shop Item',
        'item_rarity' => 'common',
        'item_type' => 'item',
        'roll_source_kind' => 'all',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $migration = include database_path('migrations/2026_04_09_210647_backfill_shop_roll_rule_sections_for_existing_databases.php');
    $migration->up();

    expect(Schema::hasColumn('shop_roll_rules', 'section_title'))->toBeTrue()
        ->and(Schema::hasColumn('item_shop', 'roll_section_title'))->toBeTrue()
        ->and(Schema::hasColumn('item_shop', 'roll_sort_order'))->toBeTrue()
        ->and(DB::table('shop_roll_rules')->value('section_title'))->toBe('Common Magic Items (Ab Low Tier)')
        ->and(DB::table('item_shop')->value('roll_section_title'))->toBe('Common Magic Items (Ab Low Tier)')
        ->and((int) DB::table('item_shop')->value('roll_sort_order'))->toBe(10);
});
