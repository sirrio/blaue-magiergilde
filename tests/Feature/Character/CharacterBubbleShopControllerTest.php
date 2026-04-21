<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterBubbleShopPurchase;
use App\Models\User;
use App\Support\CharacterProgressionState;
use App\Support\LevelProgression;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('updates bubble shop purchases and keeps legacy spend as offset', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'bubble_shop_spend' => 8,
        'bubble_shop_legacy_spend' => 8,
        'dm_bubbles' => 0,
        'is_filler' => false,
        'simplified_tracking' => false,
    ]);

    $requiredAdventureBubbles = LevelProgression::bubblesRequiredForLevel(6, $character->progression_version_id) + 2 + 8;

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => $requiredAdventureBubbles * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 1,
        'rare_language' => 0,
        'tool_or_language' => 1,
        'downtime' => 2,
    ]);

    $response->assertRedirect();

    $character->refresh();
    $purchaseMap = $character->bubbleShopPurchases()->pluck('quantity', 'type')->all();
    ksort($purchaseMap);

    expect($character->bubble_shop_legacy_spend)->toBe(8)
        ->and($character->bubble_shop_spend)->toBe(10)
        ->and($purchaseMap)->toBe([
            'downtime' => 2,
            'skill_proficiency' => 1,
            'tool_or_language' => 1,
        ]);
});

it('keeps the effective spend unchanged while structured purchases stay below the legacy stand', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'lt',
        'bubble_shop_spend' => 9,
        'bubble_shop_legacy_spend' => 9,
    ]);

    CharacterBubbleShopPurchase::factory()->for($character)->create([
        'type' => 'tool_or_language',
        'quantity' => 1,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 0,
        'rare_language' => 0,
        'tool_or_language' => 2,
        'downtime' => 1,
    ]);

    $response->assertRedirect();

    $character->refresh();

    expect($character->bubble_shop_legacy_spend)->toBe(9)
        ->and($character->bubble_shop_spend)->toBe(9);
});

it('blocks downtime purchases above the unlocked tier', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 0,
        'rare_language' => 0,
        'tool_or_language' => 0,
        'downtime' => 1,
    ]);

    $response->assertSessionHasErrors(['downtime']);
});

it('does not allow bubble shop spending beyond the current level progress', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'is_filler' => false,
        'simplified_tracking' => false,
    ]);

    $requiredBubbles = LevelProgression::bubblesRequiredForLevel(3, $character->progression_version_id) + 1;

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => $requiredBubbles * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 0,
        'rare_language' => 0,
        'tool_or_language' => 1,
        'downtime' => 0,
    ]);

    $response->assertSessionHasErrors(['bubble_shop']);
});

it('creates a level anchor before the first bubble shop change in level tracking', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    $requiredBubbles = LevelProgression::bubblesRequiredForLevel(4, $character->progression_version_id) + 2;

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => $requiredBubbles * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $state = new CharacterProgressionState;
    $before = $character->fresh('adventures');
    $expectedLevel = $state->currentLevel($before);
    $expectedAvailableBubbles = $state->availableBubbles($before);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 1,
        'rare_language' => 0,
        'tool_or_language' => 0,
        'downtime' => 0,
    ]);

    $response->assertRedirect();

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->whereNull('deleted_at')
        ->latest('id')
        ->first();

    expect($pseudo)->not->toBeNull()
        ->and($pseudo?->target_level)->toBe($expectedLevel)
        ->and($pseudo?->target_bubbles)->toBe($expectedAvailableBubbles)
        ->and($character->fresh()->bubble_shop_spend)->toBe(6);
});

it('allows unlimited downtime purchases after et is unlocked', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'ht',
        'is_filler' => false,
        'dm_bubbles' => 5000,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 0,
        'rare_language' => 0,
        'tool_or_language' => 0,
        'downtime' => 60,
    ]);

    $response->assertRedirect();

    $purchase = $character->fresh()->bubbleShopPurchases()->where('type', 'downtime')->first();

    expect($purchase)->not->toBeNull()
        ->and($purchase?->quantity)->toBe(60);
});

it('includes bubble shop purchases on the character detail payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'bubble_shop_spend' => 4,
        'bubble_shop_legacy_spend' => 4,
    ]);

    CharacterBubbleShopPurchase::factory()->for($character)->create([
        'type' => 'tool_or_language',
        'quantity' => 2,
    ]);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.bubble_shop_legacy_spend', 4)
            ->where('character.bubble_shop_purchases.0.type', 'tool_or_language')
            ->where('character.bubble_shop_purchases.0.quantity', 2));
});
