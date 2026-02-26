<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Item;
use App\Models\User;
use Illuminate\Support\Facades\DB;

test('mundane variant catalog is seeded by migration', function () {
    expect(
        DB::table('mundane_item_variants')
            ->where('slug', 'longsword')
            ->exists()
    )->toBeTrue();

    expect(
        DB::table('mundane_item_variants')
            ->where('slug', 'plate-armor')
            ->exists()
    )->toBeTrue();
});

test('legacy weapon and armor placeholder costs are backfilled', function () {
    $weaponItem = Item::factory()->create([
        'cost' => '100 GP + Waffenpreis',
    ]);
    $armorItem = Item::factory()->create([
        'cost' => '100 GP + Rüstungspreis',
    ]);

    /** @var \Illuminate\Database\Migrations\Migration $migration */
    $migration = require database_path('migrations/2026_02_26_120000_create_mundane_item_variants_and_backfill.php');
    $migration->down();
    $migration->up();

    $weaponPlaceholderId = DB::table('mundane_item_variants')
        ->where('slug', 'any-weapon-price-legacy')
        ->value('id');
    $armorPlaceholderId = DB::table('mundane_item_variants')
        ->where('slug', 'any-armor-price-legacy')
        ->value('id');

    expect(DB::table('item_mundane_variant')
        ->where('item_id', $weaponItem->id)
        ->where('mundane_item_variant_id', $weaponPlaceholderId)
        ->exists())->toBeTrue();

    expect(DB::table('item_mundane_variant')
        ->where('item_id', $armorItem->id)
        ->where('mundane_item_variant_id', $armorPlaceholderId)
        ->exists())->toBeTrue();
});

test('admin can assign mundane variants and item index returns display cost', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Arcane Weapon',
        'cost' => '100 GP',
        'type' => 'item',
        'rarity' => 'common',
    ]);

    $longswordId = (int) DB::table('mundane_item_variants')
        ->where('slug', 'longsword')
        ->value('id');
    $daggerId = (int) DB::table('mundane_item_variants')
        ->where('slug', 'dagger')
        ->value('id');

    $response = $this->actingAs($admin)->put(route('admin.items.update', $item), [
        'id' => $item->id,
        'name' => $item->name,
        'url' => $item->url,
        'cost' => $item->cost,
        'rarity' => $item->rarity,
        'type' => $item->type,
        'source_id' => null,
        'mundane_variant_ids' => [$longswordId, $daggerId],
        'shop_enabled' => true,
        'guild_enabled' => true,
        'default_spell_roll_enabled' => false,
        'ruling_changed' => false,
    ]);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $item->refresh();
    expect($item->mundaneVariants()->pluck('slug')->all())
        ->toContain('longsword')
        ->toContain('dagger');

    $inertiaVersion = app(HandleInertiaRequests::class)->version(request());
    $headers = [
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Partial-Component' => 'item/index',
        'X-Inertia-Partial-Data' => 'items',
    ];
    if (is_string($inertiaVersion) && $inertiaVersion !== '') {
        $headers['X-Inertia-Version'] = $inertiaVersion;
    }

    $indexResponse = $this->actingAs($admin)
        ->withHeaders($headers)
        ->get(route('admin.items.index'));

    $indexResponse->assertOk();
    $itemPayload = collect($indexResponse->json('props.items'))->firstWhere('id', $item->id);

    expect($itemPayload['display_cost'] ?? null)->toBeString()
        ->and($itemPayload['display_cost'])->toContain('100 GP');
    expect($itemPayload['display_cost'])->toContain('Longsword')
        ->toContain('Dagger');
});

test('item cost is derived from rarity and type on admin update', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create([
        'name' => 'Derived Cost Item',
        'type' => 'item',
        'rarity' => 'common',
        'cost' => '999999 GP',
    ]);

    $response = $this->actingAs($admin)->put(route('admin.items.update', $item), [
        'id' => $item->id,
        'name' => $item->name,
        'url' => $item->url,
        'cost' => '123456 GP',
        'rarity' => 'rare',
        'type' => 'consumable',
        'source_id' => null,
        'shop_enabled' => true,
        'guild_enabled' => true,
        'default_spell_roll_enabled' => false,
        'ruling_changed' => false,
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();

    $item->refresh();
    expect($item->cost)->toBe('2500 GP');
});

test('weapon and armor item types use full base rarity cost', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $weapon = Item::factory()->create([
        'name' => 'Weapon Cost Item',
        'type' => 'item',
        'rarity' => 'common',
        'cost' => '1 GP',
    ]);
    $armor = Item::factory()->create([
        'name' => 'Armor Cost Item',
        'type' => 'item',
        'rarity' => 'common',
        'cost' => '1 GP',
    ]);

    $this->actingAs($admin)->put(route('admin.items.update', $weapon), [
        'id' => $weapon->id,
        'name' => $weapon->name,
        'url' => $weapon->url,
        'cost' => '999 GP',
        'rarity' => 'rare',
        'type' => 'weapon',
        'source_id' => null,
        'shop_enabled' => true,
        'guild_enabled' => true,
        'default_spell_roll_enabled' => false,
        'ruling_changed' => false,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($admin)->put(route('admin.items.update', $armor), [
        'id' => $armor->id,
        'name' => $armor->name,
        'url' => $armor->url,
        'cost' => '999 GP',
        'rarity' => 'very_rare',
        'type' => 'armor',
        'source_id' => null,
        'shop_enabled' => true,
        'guild_enabled' => true,
        'default_spell_roll_enabled' => false,
        'ruling_changed' => false,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $weapon->refresh();
    $armor->refresh();

    expect($weapon->cost)->toBe('5000 GP')
        ->and($armor->cost)->toBe('20000 GP');
});
