<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\CharacterBubbleShopPurchase;
use App\Models\User;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterProgressionSnapshotResolver;
use App\Support\LevelProgression;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function resolveSnapshotSpend(Character $character): int
{
    return (int) (app(CharacterProgressionSnapshotResolver::class)->snapshot($character)['bubble_shop_spend'] ?? 0);
}

it('updates bubble shop purchases', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'lt',
        'is_filler' => true,
        'simplified_tracking' => false,
    ]);
    recordCharacterSnapshot($character);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 1,
        'rare_language' => 0,
        'tool_or_language' => 1,
        'downtime' => 2,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $character->refresh();
    $purchaseMap = $character->bubbleShopPurchases()->pluck('quantity', 'type')->all();
    ksort($purchaseMap);
    $refreshed = recordCharacterSnapshot($character);

    expect(resolveSnapshotSpend($refreshed))->toBe(10)
        ->and($purchaseMap)->toBe([
            'downtime' => 2,
            'skill_proficiency' => 1,
            'tool_or_language' => 1,
        ]);
});

it('blocks downtime purchases above the unlocked tier', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
    ]);
    recordCharacterSnapshot($character);

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
        'is_filler' => false,
        'simplified_tracking' => false,
    ]);

    $requiredBubbles = LevelProgression::bubblesRequiredForLevel(3, $character->progression_version_id) + 1;

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => $requiredBubbles * 10800,
        'has_additional_bubble' => false,
        'start_date' => '2026-01-01',
    ]);
    recordCharacterSnapshot($character);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 0,
        'rare_language' => 0,
        'tool_or_language' => 1,
        'downtime' => 0,
    ]);

    $response->assertSessionHasErrors(['bubble_shop']);
});

it('creates a level anchor before the first valid bubble shop change in level tracking', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    $requiredBubbles = LevelProgression::bubblesRequiredForLevel(4, $character->progression_version_id) + 2;

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => $requiredBubbles * 10800,
        'has_additional_bubble' => false,
        'start_date' => '2026-01-01',
    ]);
    recordCharacterSnapshot($character);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 0,
        'rare_language' => 0,
        'tool_or_language' => 1,
        'downtime' => 0,
    ]);

    $response->assertRedirect();

    $levelAnchor = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    expect($levelAnchor)->not->toBeNull()
        ->and($levelAnchor?->delta['target_level'] ?? null)->toBe(4)
        ->and(resolveSnapshotSpend($character))->toBe(2);
});

it('allows unlimited downtime purchases after et is unlocked', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'ht',
        'is_filler' => false,
    ]);
    app(CharacterAuditTrail::class)->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 5000, 'dm_bubbles' => 5000]);
    recordCharacterSnapshot($character);

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
    $character = Character::factory()->for($user)->create();
    app(CharacterAuditTrail::class)->record($character, 'bubble_shop.updated', delta: ['bubbles' => -4, 'bubble_shop_spend' => 4]);

    CharacterBubbleShopPurchase::factory()->for($character)->create([
        'type' => 'tool_or_language',
        'quantity' => 2,
    ]);
    recordCharacterSnapshot($character);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.bubble_shop_purchases.0.type', 'tool_or_language')
            ->where('character.bubble_shop_purchases.0.quantity', 2));
});
