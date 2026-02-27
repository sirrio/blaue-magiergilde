<?php

use App\Models\CompendiumSuggestion;
use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\Source;
use App\Models\Spell;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated users can access compendium item and spell pages', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->get(route('compendium.items.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('compendium.spells.index'))
        ->assertOk();
});

test('compendium pages stay in suggestion mode for admins', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->get(route('compendium.items.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', false)
            ->where('indexRoute', 'compendium.items.index'));

    $this->actingAs($admin)
        ->get(route('compendium.spells.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', false)
            ->where('indexRoute', 'compendium.spells.index'));
});

test('authenticated user can submit an item compendium suggestion', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Potion of Healing',
        'url' => 'https://example.test/potion',
        'cost' => '50 GP',
        'rarity' => 'common',
        'type' => 'consumable',
        'source_id' => null,
    ]);

    $response = $this->actingAs($user)->post(route('compendium-suggestions.store'), [
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'changes' => [
            'name' => 'Potion of Greater Healing',
            'cost' => '100 GP',
            'rarity' => 'uncommon',
        ],
        'notes' => 'Please update item values.',
        'source_url' => 'https://example.test/reference',
    ]);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $suggestion = CompendiumSuggestion::query()->latest('id')->first();

    expect($suggestion)->not->toBeNull()
        ->and($suggestion?->user_id)->toBe($user->id)
        ->and($suggestion?->kind)->toBe(CompendiumSuggestion::KIND_ITEM)
        ->and($suggestion?->target_id)->toBe($item->id)
        ->and($suggestion?->status)->toBe(CompendiumSuggestion::STATUS_PENDING)
        ->and($suggestion?->proposed_payload)->toMatchArray([
            'name' => 'Potion of Greater Healing',
            'cost' => '100 GP',
            'rarity' => 'uncommon',
        ]);
});

test('authenticated user can submit an item compendium suggestion with mundane variants', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Sword of Testing',
        'url' => 'https://example.test/sword-of-testing',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'weapon',
        'source_id' => null,
    ]);

    $club = MundaneItemVariant::factory()->create([
        'name' => 'Club',
        'slug' => 'club-suggestion-submit',
        'category' => 'weapon',
        'is_placeholder' => false,
    ]);
    $dagger = MundaneItemVariant::factory()->create([
        'name' => 'Dagger',
        'slug' => 'dagger-suggestion-submit',
        'category' => 'weapon',
        'is_placeholder' => false,
    ]);
    $expectedVariantIds = collect([$dagger->id, $club->id])
        ->sort()
        ->values()
        ->all();

    $response = $this->actingAs($user)->post(route('compendium-suggestions.store'), [
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'changes' => [
            'mundane_variant_ids' => [$dagger->id, $club->id, $club->id],
        ],
        'notes' => 'Attach specific weapon variants.',
    ]);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $suggestion = CompendiumSuggestion::query()->latest('id')->first();

    expect($suggestion)->not->toBeNull()
        ->and($suggestion?->kind)->toBe(CompendiumSuggestion::KIND_ITEM)
        ->and($suggestion?->target_id)->toBe($item->id)
        ->and($suggestion?->proposed_payload)->toMatchArray([
            'mundane_variant_ids' => $expectedVariantIds,
        ]);
});

test('item compendium suggestion rejects mundane variants on non weapon or armor types', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Potion of Testing',
        'url' => 'https://example.test/potion-of-testing',
        'cost' => '50 GP',
        'rarity' => 'common',
        'type' => 'consumable',
    ]);
    $variant = MundaneItemVariant::factory()->create([
        'name' => 'Longsword',
        'slug' => 'longsword-validation',
        'category' => 'weapon',
        'is_placeholder' => false,
    ]);

    $response = $this->actingAs($user)->post(route('compendium-suggestions.store'), [
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'changes' => [
            'mundane_variant_ids' => [$variant->id],
        ],
    ]);

    $response->assertRedirect()
        ->assertSessionHasErrors(['mundane_variant_ids']);
});

test('authenticated user can submit a new item compendium suggestion without target id', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $source = Source::factory()->create([
        'name' => "Dungeon Master's Guide",
        'shortcode' => 'DMG',
    ]);

    $response = $this->actingAs($user)->post(route('compendium-suggestions.store'), [
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'changes' => [
            'name' => 'Moon-Touched Sword',
            'type' => 'item',
            'rarity' => 'unknown_rarity',
            'cost' => '150 GP',
            'url' => 'https://example.test/items/moon-touched-sword',
            'source_id' => $source->id,
        ],
        'notes' => 'Seen in session loot list.',
        'source_url' => 'https://example.test/reference/moon-touched-sword',
    ]);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $suggestion = CompendiumSuggestion::query()->latest('id')->first();

    expect($suggestion)->not->toBeNull()
        ->and($suggestion?->kind)->toBe(CompendiumSuggestion::KIND_ITEM)
        ->and($suggestion?->target_id)->toBeNull()
        ->and($suggestion?->current_snapshot)->toBeNull()
        ->and($suggestion?->proposed_payload)->toMatchArray([
            'name' => 'Moon-Touched Sword',
            'type' => 'item',
            'rarity' => 'unknown_rarity',
            'cost' => '150 GP',
            'url' => 'https://example.test/items/moon-touched-sword',
            'source_id' => $source->id,
        ]);
});

test('item suggestion requires at least one change or a note', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Potion of Healing',
        'url' => 'https://example.test/potion',
        'cost' => '50 GP',
        'rarity' => 'common',
        'type' => 'consumable',
        'source_id' => null,
    ]);

    $response = $this->actingAs($user)->post(route('compendium-suggestions.store'), [
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'changes' => [
            'name' => 'Potion of Healing',
            'url' => 'https://example.test/potion',
            'cost' => '50 GP',
            'rarity' => 'common',
            'type' => 'consumable',
            'source_id' => null,
        ],
    ]);

    $response->assertRedirect()
        ->assertSessionHasErrors(['changes']);
});

test('admin can approve pending item suggestion and apply changes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Potion of Healing',
        'url' => 'https://example.test/potion',
        'cost' => '50 GP',
        'rarity' => 'common',
        'type' => 'consumable',
        'source_id' => null,
    ]);

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'name' => 'Potion of Greater Healing',
            'cost' => '100 GP',
            'rarity' => 'uncommon',
        ],
        'current_snapshot' => [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'rarity' => $item->rarity,
            'type' => $item->type,
            'source_id' => $item->source_id,
        ],
    ]);

    $response = $this->actingAs($admin)->patch(route('admin.compendium-suggestions.approve', $suggestion), [
        'review_notes' => 'Applied.',
    ]);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $item->refresh();
    $suggestion->refresh();

    expect($item->name)->toBe('Potion of Greater Healing')
        ->and($item->cost)->toBe('100 GP')
        ->and($item->rarity)->toBe('uncommon')
        ->and($suggestion->status)->toBe(CompendiumSuggestion::STATUS_APPROVED)
        ->and($suggestion->reviewed_by)->toBe($admin->id)
        ->and($suggestion->review_notes)->toBe('Applied.')
        ->and($suggestion->reviewed_at)->not->toBeNull();
});

test('admin can approve pending item suggestion and sync mundane variants', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Sword of Testing',
        'url' => 'https://example.test/sword-of-testing',
        'cost' => '100 GP',
        'rarity' => 'common',
        'type' => 'weapon',
    ]);

    $longsword = MundaneItemVariant::factory()->create([
        'name' => 'Longsword',
        'slug' => 'longsword-suggestion-approve',
        'category' => 'weapon',
        'is_placeholder' => false,
    ]);
    $warhammer = MundaneItemVariant::factory()->create([
        'name' => 'Warhammer',
        'slug' => 'warhammer-suggestion-approve',
        'category' => 'weapon',
        'is_placeholder' => false,
    ]);
    $item->mundaneVariants()->sync([$longsword->id]);

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'mundane_variant_ids' => [$warhammer->id],
        ],
        'current_snapshot' => [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'extra_cost_note' => $item->extra_cost_note,
            'rarity' => $item->rarity,
            'type' => $item->type,
            'source_id' => $item->source_id,
            'mundane_variant_ids' => [$longsword->id],
        ],
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.compendium-suggestions.approve', $suggestion), [])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $item->refresh();
    $suggestion->refresh();

    $syncedVariantIds = $item->mundaneVariants()->pluck('mundane_item_variants.id')->map(static fn ($id): int => (int) $id)->all();

    expect($syncedVariantIds)->toBe([$warhammer->id])
        ->and($suggestion->status)->toBe(CompendiumSuggestion::STATUS_APPROVED);
});

test('admin can approve pending spell suggestion and apply changes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $spell = Spell::factory()->create([
        'name' => 'Fireball',
        'url' => 'https://example.test/fireball',
        'legacy_url' => null,
        'spell_school' => 'evocation',
        'spell_level' => 3,
        'source_id' => null,
    ]);

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_SPELL,
        'target_id' => $spell->id,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'legacy_url' => 'https://example.test/fireball-legacy',
            'spell_level' => 4,
        ],
        'current_snapshot' => [
            'name' => $spell->name,
            'url' => $spell->url,
            'legacy_url' => $spell->legacy_url,
            'spell_school' => $spell->spell_school,
            'spell_level' => $spell->spell_level,
            'source_id' => $spell->source_id,
        ],
    ]);

    $response = $this->actingAs($admin)->patch(route('admin.compendium-suggestions.approve', $suggestion), []);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $spell->refresh();
    $suggestion->refresh();

    expect($spell->legacy_url)->toBe('https://example.test/fireball-legacy')
        ->and($spell->spell_level)->toBe(4)
        ->and($suggestion->status)->toBe(CompendiumSuggestion::STATUS_APPROVED)
        ->and($suggestion->reviewed_by)->toBe($admin->id);
});

test('admin can approve pending new item suggestion and create item', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => null,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'name' => 'Glamoured Studded Leather',
            'url' => 'https://example.test/items/glamoured-studded-leather',
            'cost' => '250 GP',
            'rarity' => 'rare',
            'type' => 'item',
            'source_id' => $source->id,
        ],
        'current_snapshot' => null,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.compendium-suggestions.approve', $suggestion), [])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $suggestion->refresh();
    $createdItem = Item::query()->find($suggestion->target_id);

    expect($createdItem)->not->toBeNull()
        ->and($createdItem?->name)->toBe('Glamoured Studded Leather')
        ->and($createdItem?->rarity)->toBe('rare')
        ->and($createdItem?->type)->toBe('item')
        ->and($createdItem?->source_id)->toBe($source->id)
        ->and($suggestion->status)->toBe(CompendiumSuggestion::STATUS_APPROVED)
        ->and($suggestion->reviewed_by)->toBe($admin->id);
});

test('admin can approve pending new item suggestion and sync mundane variants', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $mace = MundaneItemVariant::factory()->create([
        'name' => 'Mace',
        'slug' => 'mace-suggestion-create',
        'category' => 'weapon',
        'is_placeholder' => false,
    ]);

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => null,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'name' => 'Rune Mace',
            'url' => 'https://example.test/items/rune-mace',
            'cost' => '1000 GP',
            'rarity' => 'uncommon',
            'type' => 'weapon',
            'mundane_variant_ids' => [$mace->id],
        ],
        'current_snapshot' => null,
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.compendium-suggestions.approve', $suggestion), [])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $suggestion->refresh();
    $createdItem = Item::query()->find($suggestion->target_id);

    expect($createdItem)->not->toBeNull()
        ->and($createdItem?->type)->toBe('weapon')
        ->and($createdItem?->mundaneVariants()->pluck('mundane_item_variants.id')->map(static fn ($id): int => (int) $id)->all())->toBe([$mace->id])
        ->and($suggestion->status)->toBe(CompendiumSuggestion::STATUS_APPROVED);
});

test('admin can approve suggestion with legacy nested changes payload', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Potion of Healing',
        'cost' => '50 GP',
        'rarity' => 'common',
        'type' => 'consumable',
    ]);

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'changes' => [
                'cost' => '75 GP',
                'rarity' => 'uncommon',
            ],
        ],
        'current_snapshot' => [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'rarity' => $item->rarity,
            'type' => $item->type,
            'source_id' => $item->source_id,
        ],
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.compendium-suggestions.approve', $suggestion), [])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $item->refresh();
    $suggestion->refresh();

    expect($item->cost)->toBe('75 GP')
        ->and($item->rarity)->toBe('uncommon')
        ->and($suggestion->status)->toBe(CompendiumSuggestion::STATUS_APPROVED);
});

test('approve fails when payload has no applicable fields', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create();

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'unsupported_field' => 'value',
        ],
        'current_snapshot' => [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'rarity' => $item->rarity,
            'type' => $item->type,
            'source_id' => $item->source_id,
        ],
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.compendium-suggestions.approve', $suggestion), [])
        ->assertRedirect()
        ->assertSessionHasErrors(['suggestion']);

    $suggestion->refresh();

    expect($suggestion->status)->toBe(CompendiumSuggestion::STATUS_PENDING);
});

test('admin can reject pending suggestion without applying changes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $submitter = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create([
        'name' => 'Potion of Healing',
        'cost' => '50 GP',
        'rarity' => 'common',
        'type' => 'consumable',
    ]);

    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $submitter->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => [
            'name' => 'Potion of Greater Healing',
        ],
        'current_snapshot' => [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'rarity' => $item->rarity,
            'type' => $item->type,
            'source_id' => $item->source_id,
        ],
    ]);

    $response = $this->actingAs($admin)->patch(route('admin.compendium-suggestions.reject', $suggestion), [
        'review_notes' => 'Not enough evidence.',
    ]);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $item->refresh();
    $suggestion->refresh();

    expect($item->name)->toBe('Potion of Healing')
        ->and($suggestion->status)->toBe(CompendiumSuggestion::STATUS_REJECTED)
        ->and($suggestion->reviewed_by)->toBe($admin->id)
        ->and($suggestion->review_notes)->toBe('Not enough evidence.')
        ->and($suggestion->reviewed_at)->not->toBeNull();
});

test('non admin users cannot review suggestions', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create();
    $suggestion = CompendiumSuggestion::query()->create([
        'user_id' => $user->id,
        'kind' => CompendiumSuggestion::KIND_ITEM,
        'target_id' => $item->id,
        'status' => CompendiumSuggestion::STATUS_PENDING,
        'proposed_payload' => ['name' => 'Updated'],
        'current_snapshot' => [
            'name' => $item->name,
            'url' => $item->url,
            'cost' => $item->cost,
            'rarity' => $item->rarity,
            'type' => $item->type,
            'source_id' => $item->source_id,
        ],
    ]);

    $this->actingAs($user)
        ->patch(route('admin.compendium-suggestions.approve', $suggestion), [])
        ->assertForbidden();

    $this->actingAs($user)
        ->patch(route('admin.compendium-suggestions.reject', $suggestion), [])
        ->assertForbidden();
});

test('admin suggestions index includes source labels for display', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $source = Source::factory()->create([
        'name' => "Player's Handbook",
        'shortcode' => 'PHB',
    ]);
    $variant = MundaneItemVariant::factory()->create([
        'name' => 'Longsword',
        'slug' => 'longsword-suggestion-index',
        'category' => 'weapon',
        'is_placeholder' => false,
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.compendium-suggestions.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $sourceLabels = $props['sourceLabels'] ?? [];
    $variantLabels = $props['variantLabels'] ?? [];

    expect($sourceLabels)->toBeArray();
    expect($sourceLabels[(string) $source->id] ?? null)->toBe("Player's Handbook");
    expect($variantLabels)->toBeArray();
    expect($variantLabels[(string) $variant->id] ?? null)->toBe('Longsword (weapon)');
});
