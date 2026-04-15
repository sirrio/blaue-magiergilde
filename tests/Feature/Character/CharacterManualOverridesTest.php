<?php

use App\Models\Character;
use App\Models\User;

it('stores manual character overrides for the owner', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'name' => 'Override Test',
        'faction' => 'bibliothekare',
        'version' => '2024',
        'dm_bubbles' => 2,
        'dm_coins' => 4,
        'bubble_shop_spend' => 1,
        'is_filler' => false,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.manual-overrides', $character), [
        'manual_adventures_count_enabled' => true,
        'manual_adventures_count' => 9,
        'manual_faction_rank_enabled' => true,
        'manual_faction_rank' => 4,
    ]);

    $response->assertRedirect();

    $character->refresh();

    expect($character->manual_adventures_count)->toBe(9)
        ->and($character->manual_faction_rank)->toBe(4);
});

it('clears manual character overrides when disabled', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'manual_adventures_count' => 6,
        'manual_faction_rank' => 5,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.manual-overrides', $character), [
        'manual_adventures_count_enabled' => false,
        'manual_adventures_count' => 0,
        'manual_faction_rank_enabled' => false,
        'manual_faction_rank' => 0,
    ]);

    $response->assertRedirect();

    $character->refresh();

    expect($character->manual_adventures_count)->toBeNull()
        ->and($character->manual_faction_rank)->toBeNull();
});

it('forbids updating manual character overrides on foreign characters', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->for($owner)->create();

    $response = $this->actingAs($otherUser)->patch(route('characters.manual-overrides', $character), [
        'manual_adventures_count_enabled' => true,
        'manual_adventures_count' => 3,
        'manual_faction_rank_enabled' => true,
        'manual_faction_rank' => 3,
    ]);

    $response->assertForbidden();
});
