<?php

use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopRollRule;
use App\Models\Source;
use App\Models\User;
use App\Services\ShopRollService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('lets admins update shop roll rows without recreating existing row ids', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $existingHeading = ShopRollRule::query()->create([
        'row_kind' => 'heading',
        'rarity' => 'common',
        'selection_types' => ['item'],
        'source_kind' => 'all',
        'heading_title' => 'Common picks',
        'count' => 0,
        'sort_order' => 10,
    ]);
    $existingRule = ShopRollRule::query()->create([
        'row_kind' => 'rule',
        'rarity' => 'common',
        'selection_types' => ['weapon', 'armor', 'item'],
        'source_kind' => 'official',
        'heading_title' => '',
        'count' => 2,
        'sort_order' => 20,
    ]);

    $response = $this->actingAs($admin)
        ->patchJson(route('admin.shop-settings.update'), [
            'roll_rules' => [
                [
                    'id' => $existingHeading->id,
                    'row_kind' => 'heading',
                    'rarity' => 'common',
                    'selection_types' => ['item'],
                    'source_kind' => 'all',
                    'heading_title' => '## ***:crossed_swords: Common WotC Picks:***',
                    'count' => 0,
                    'sort_order' => 10,
                ],
                [
                    'id' => $existingRule->id,
                    'row_kind' => 'rule',
                    'rarity' => 'common',
                    'selection_types' => ['weapon', 'armor', 'item'],
                    'source_kind' => 'official',
                    'heading_title' => '',
                    'count' => 5,
                    'sort_order' => 20,
                ],
                [
                    'row_kind' => 'rule',
                    'rarity' => 'common',
                    'selection_types' => ['consumable'],
                    'source_kind' => 'partnered',
                    'heading_title' => '',
                    'count' => 1,
                    'sort_order' => 30,
                ],
            ],
        ]);

    $response->assertOk()
        ->assertJsonPath('shop_settings.roll_rules.0.id', $existingHeading->id)
        ->assertJsonPath('shop_settings.roll_rules.0.heading_title', '## ***:crossed_swords: Common WotC Picks:***')
        ->assertJsonPath('shop_settings.roll_rules.1.id', $existingRule->id)
        ->assertJsonPath('shop_settings.roll_rules.1.count', 5)
        ->assertJsonPath('shop_settings.roll_rules.2.row_kind', 'rule')
        ->assertJsonPath('shop_settings.roll_rules.2.source_kind', 'partnered');

    expect(ShopRollRule::query()->count())->toBe(3)
        ->and($existingHeading->fresh()?->heading_title)->toBe('## ***:crossed_swords: Common WotC Picks:***')
        ->and($existingRule->fresh()?->count)->toBe(5)
        ->and(
            ShopRollRule::query()
                ->where('id', '!=', $existingHeading->id)
                ->where('id', '!=', $existingRule->id)
                ->exists()
        )->toBeTrue();
});

it('stores the rule row id on rolled shop items', function () {
    ShopRollRule::query()->delete();

    ShopRollRule::query()->create([
        'row_kind' => 'heading',
        'rarity' => 'common',
        'selection_types' => ['item'],
        'source_kind' => 'all',
        'heading_title' => 'Official Common Gear',
        'count' => 0,
        'sort_order' => 10,
    ]);
    $rule = ShopRollRule::query()->create([
        'row_kind' => 'rule',
        'rarity' => 'common',
        'selection_types' => ['weapon', 'item'],
        'source_kind' => 'official',
        'heading_title' => '',
        'count' => 1,
        'sort_order' => 20,
    ]);

    $officialSource = Source::factory()->create([
        'name' => 'Player Handbook',
        'shortcode' => 'PHB',
        'kind' => 'official',
    ]);
    $thirdPartySource = Source::factory()->create([
        'name' => 'Kobold Press',
        'shortcode' => 'KP',
        'kind' => 'partnered',
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
        ->and($rolledLine?->roll_rule_id)->toBe($rule->id);
});

it('stores a roll row snapshot on rolled shops and keeps it stable after rule reordering', function () {
    ShopRollRule::query()->delete();

    $heading = ShopRollRule::query()->create([
        'row_kind' => 'heading',
        'rarity' => 'common',
        'selection_types' => ['item'],
        'source_kind' => 'all',
        'heading_title' => '## ***:crossed_swords: Common Picks:***',
        'count' => 0,
        'sort_order' => 10,
    ]);
    $rule = ShopRollRule::query()->create([
        'row_kind' => 'rule',
        'rarity' => 'common',
        'selection_types' => ['item'],
        'source_kind' => 'all',
        'heading_title' => '',
        'count' => 1,
        'sort_order' => 20,
    ]);

    Item::factory()->create([
        'name' => 'Snapshot Blade',
        'rarity' => 'common',
        'type' => 'item',
        'shop_enabled' => true,
        'pick_count' => 0,
    ]);

    $shop = app(ShopRollService::class)->roll()->fresh();

    expect($shop?->roll_rows_snapshot)->toBeArray()
        ->and($shop?->roll_rows_snapshot[0]['id'] ?? null)->toBe($heading->id)
        ->and($shop?->roll_rows_snapshot[0]['heading_title'] ?? null)->toBe('## ***:crossed_swords: Common Picks:***')
        ->and($shop?->roll_rows_snapshot[0]['sort_order'] ?? null)->toBe(10)
        ->and($shop?->roll_rows_snapshot[1]['id'] ?? null)->toBe($rule->id)
        ->and($shop?->roll_rows_snapshot[1]['sort_order'] ?? null)->toBe(20);

    $heading->update([
        'heading_title' => '## ***:crossed_swords: Changed Later:***',
        'sort_order' => 30,
    ]);
    $rule->update([
        'sort_order' => 10,
    ]);

    $shop = $shop?->fresh();

    expect($shop?->roll_rows_snapshot[0]['id'] ?? null)->toBe($heading->id)
        ->and($shop?->roll_rows_snapshot[0]['heading_title'] ?? null)->toBe('## ***:crossed_swords: Common Picks:***')
        ->and($shop?->roll_rows_snapshot[0]['sort_order'] ?? null)->toBe(10)
        ->and($shop?->roll_rows_snapshot[1]['id'] ?? null)->toBe($rule->id)
        ->and($shop?->roll_rows_snapshot[1]['sort_order'] ?? null)->toBe(20);
});

it('rolls third-party items only for third-party rules', function () {
    ShopRollRule::query()->delete();

    ShopRollRule::query()->create([
        'row_kind' => 'heading',
        'rarity' => 'common',
        'selection_types' => ['item'],
        'source_kind' => 'all',
        'heading_title' => 'Third-party common gear',
        'count' => 0,
        'sort_order' => 10,
    ]);
    $rule = ShopRollRule::query()->create([
        'row_kind' => 'rule',
        'rarity' => 'common',
        'selection_types' => ['weapon', 'armor', 'item'],
        'source_kind' => 'partnered',
        'heading_title' => '',
        'count' => 1,
        'sort_order' => 20,
    ]);

    $officialSource = Source::factory()->create([
        'name' => 'Dungeon Master’s Guide',
        'shortcode' => 'DMG',
        'kind' => 'official',
    ]);
    $thirdPartySource = Source::factory()->create([
        'name' => 'The Griffon\'s Saddlebag',
        'shortcode' => 'GSB',
        'kind' => 'partnered',
    ]);

    Item::factory()->create([
        'name' => 'Official Blade',
        'rarity' => 'common',
        'type' => 'item',
        'shop_enabled' => true,
        'pick_count' => 0,
        'source_id' => $officialSource->id,
    ]);
    $thirdPartyItem = Item::factory()->create([
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
        ->and($rolledLine?->item_id)->toBe($thirdPartyItem->id)
        ->and($rolledLine?->roll_source_kind)->toBe('partnered')
        ->and($rolledLine?->roll_rule_id)->toBe($rule->id);
});

it('backfills existing shop items to the new roll rule fields during migration', function () {
    $source = Source::factory()->create([
        'kind' => 'official',
    ]);
    $item = Item::factory()->create([
        'rarity' => 'common',
        'type' => 'consumable',
        'source_id' => $source->id,
    ]);
    $shop = Shop::factory()->create();
    $shopItemId = DB::table('item_shop')->insertGetId([
        'shop_id' => $shop->id,
        'item_id' => $item->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    Schema::table('item_shop', function (Blueprint $table) {
        $table->dropForeign(['roll_rule_id']);
        $table->dropColumn('roll_rule_id');
        $table->dropColumn('roll_source_kind');
    });

    $migration = require database_path('migrations/2026_04_09_200204_add_roll_source_kind_to_item_shop_table.php');
    $migration->up();

    $shopItem = DB::table('item_shop')->where('id', $shopItemId)->first();
    $expectedRuleId = ShopRollRule::query()
        ->where('row_kind', 'rule')
        ->where('rarity', 'common')
        ->where('selection_types', json_encode(['consumable']))
        ->value('id');

    expect($shopItem)->not->toBeNull()
        ->and($shopItem?->roll_source_kind)->toBe('official')
        ->and((int) $shopItem?->roll_rule_id)->toBe($expectedRuleId);
});
