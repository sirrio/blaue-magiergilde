<?php

use App\Models\CompendiumSuggestion;
use App\Models\Item;
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
