<?php

use App\Models\Character;
use App\Models\CharacterBubbleShopPurchase;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterBubbleShop;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function recordBubbleShopTestSnapshot(Character $character): Character
{
    app(CharacterAuditTrail::class)->record($character, 'test.snapshot', metadata: ['hidden_from_history' => true]);

    return $character->fresh('latestAuditSnapshot', 'bubbleShopPurchases');
}

it('calculates structured spend and extra downtime bonus from purchases', function () {
    $character = Character::factory()->create([
        'start_tier' => 'ht',
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
        ->and($bubbleShop->extraDowntimeSeconds($character->fresh('bubbleShopPurchases')))->toBe(86400);
});

it('locks downtime purchases until the required tier is reached', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
    ]);

    $bubbleShop = new CharacterBubbleShop;

    expect($bubbleShop->maxQuantity(recordBubbleShopTestSnapshot($character), CharacterBubbleShop::TYPE_DOWNTIME))->toBe(0);
});

it('expands downtime purchases by unlocked tier', function () {
    $ltCharacter = Character::factory()->create([
        'start_tier' => 'lt',
        'is_filler' => false,
    ]);
    $htCharacter = Character::factory()->create([
        'start_tier' => 'ht',
        'is_filler' => false,
    ]);
    $etCharacter = Character::factory()->create([
        'start_tier' => 'ht',
        'is_filler' => false,
    ]);
    app(CharacterAuditTrail::class)->record($etCharacter, 'dm_bubbles.granted', delta: [
        'bubbles' => 5000,
        'dm_bubbles' => 5000,
    ]);

    $bubbleShop = new CharacterBubbleShop;

    expect($bubbleShop->maxQuantity(recordBubbleShopTestSnapshot($ltCharacter), CharacterBubbleShop::TYPE_DOWNTIME))->toBe(15)
        ->and($bubbleShop->maxQuantity(recordBubbleShopTestSnapshot($htCharacter), CharacterBubbleShop::TYPE_DOWNTIME))->toBe(45)
        ->and($bubbleShop->maxQuantity(recordBubbleShopTestSnapshot($etCharacter), CharacterBubbleShop::TYPE_DOWNTIME))->toBeNull();
});
