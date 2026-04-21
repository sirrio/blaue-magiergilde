<?php

use App\Models\Character;
use App\Models\CharacterBubbleShopPurchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('updates bubble shop purchases and keeps legacy spend as offset', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'lt',
        'bubble_shop_spend' => 8,
        'bubble_shop_legacy_spend' => 8,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.bubble-shop', $character), [
        'skill_proficiency' => 1,
        'rare_language' => 0,
        'tool_or_language' => 1,
        'lt_downtime' => 2,
        'ht_downtime' => 0,
    ]);

    $response->assertRedirect();

    $character->refresh();
    $purchaseMap = $character->bubbleShopPurchases()->pluck('quantity', 'type')->all();
    ksort($purchaseMap);

    expect($character->bubble_shop_legacy_spend)->toBe(8)
        ->and($character->bubble_shop_spend)->toBe(10)
        ->and($purchaseMap)->toBe([
            'lt_downtime' => 2,
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
        'lt_downtime' => 1,
        'ht_downtime' => 0,
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
        'lt_downtime' => 1,
        'ht_downtime' => 1,
    ]);

    $response->assertSessionHasErrors(['lt_downtime', 'ht_downtime']);
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
