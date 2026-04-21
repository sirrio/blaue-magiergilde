<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Support\CharacterProgressionState;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('keeps dm bubbles and bubble shop spend until a level anchor exists', function () {
    $character = Character::factory()->create([
        'simplified_tracking' => true,
        'dm_bubbles' => 7,
        'bubble_shop_spend' => 3,
    ]);

    $state = new CharacterProgressionState;

    expect($state->usesManualLevelTracking($character))->toBeFalse()
        ->and($state->dmBubblesForProgression($character))->toBe(7)
        ->and($state->bubbleShopSpendForProgression($character))->toBe(3);
});

it('ignores dm bubbles and bubble shop spend once pseudo adventures exist', function () {
    $character = Character::factory()->create([
        'simplified_tracking' => false,
        'dm_bubbles' => 9,
        'bubble_shop_spend' => 4,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
    ]);

    $state = new CharacterProgressionState;

    expect($state->usesManualLevelTracking($character->fresh('adventures')))->toBeTrue()
        ->and($state->dmBubblesForProgression($character->fresh('adventures')))->toBe(0)
        ->and($state->bubbleShopSpendForProgression($character->fresh('adventures')))->toBe(0);
});
