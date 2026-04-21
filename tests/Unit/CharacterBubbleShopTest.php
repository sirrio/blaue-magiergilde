<?php

use App\Models\Character;
use App\Models\CharacterBubbleShopPurchase;
use App\Support\CharacterBubbleShop;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('calculates structured spend, legacy coverage and extra downtime bonus', function () {
    $character = Character::factory()->create([
        'start_tier' => 'ht',
        'bubble_shop_spend' => 8,
        'bubble_shop_legacy_spend' => 8,
    ]);

    CharacterBubbleShopPurchase::factory()->for($character)->create([
        'type' => CharacterBubbleShop::TYPE_SKILL_PROFICIENCY,
        'quantity' => 1,
    ]);
    CharacterBubbleShopPurchase::factory()->for($character)->create([
        'type' => CharacterBubbleShop::TYPE_DOWNTIME,
        'quantity' => 3,
    ]);

    $bubbleShop = new CharacterBubbleShop;

    expect($bubbleShop->structuredSpend($character->fresh('bubbleShopPurchases')))->toBe(9)
        ->and($bubbleShop->coveredByLegacy($character->fresh('bubbleShopPurchases')))->toBe(8)
        ->and($bubbleShop->additionalSpendBeyondLegacy($character->fresh('bubbleShopPurchases')))->toBe(1)
        ->and($bubbleShop->effectiveSpend($character->fresh('bubbleShopPurchases')))->toBe(9)
        ->and($bubbleShop->extraDowntimeSeconds($character->fresh('bubbleShopPurchases')))->toBe(86400);
});

it('locks downtime purchases until the required tier is reached', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
    ]);

    $bubbleShop = new CharacterBubbleShop;

    expect($bubbleShop->maxQuantity($character, CharacterBubbleShop::TYPE_DOWNTIME))->toBe(0);
});

it('expands downtime purchases by unlocked tier', function () {
    $ltCharacter = Character::factory()->create([
        'start_tier' => 'lt',
        'is_filler' => false,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
    ]);
    $htCharacter = Character::factory()->create([
        'start_tier' => 'ht',
        'is_filler' => false,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
    ]);
    $etCharacter = Character::factory()->create([
        'start_tier' => 'ht',
        'is_filler' => false,
        'dm_bubbles' => 5000,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
    ]);

    $bubbleShop = new CharacterBubbleShop;

    expect($bubbleShop->maxQuantity($ltCharacter, CharacterBubbleShop::TYPE_DOWNTIME))->toBe(15)
        ->and($bubbleShop->maxQuantity($htCharacter, CharacterBubbleShop::TYPE_DOWNTIME))->toBe(45)
        ->and($bubbleShop->maxQuantity($etCharacter, CharacterBubbleShop::TYPE_DOWNTIME))->toBeNull();
});
