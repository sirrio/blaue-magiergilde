<?php

use App\Models\Character;
use App\Models\User;

it('preserves unrelated manual overrides when updating faction rank only', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'manual_adventures_count' => 7,
        'manual_faction_rank' => 2,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.manual-overrides', $character), [
        'manual_faction_rank_enabled' => true,
        'manual_faction_rank' => 4,
    ]);

    $response->assertRedirect();

    $character->refresh();

    expect($character->manual_adventures_count)->toBe(7)
        ->and($character->manual_faction_rank)->toBe(4);
});

it('preserves unrelated manual overrides when updating adventures count only', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'manual_adventures_count' => 5,
        'manual_faction_rank' => 3,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.manual-overrides', $character), [
        'manual_adventures_count_enabled' => true,
        'manual_adventures_count' => 8,
    ]);

    $response->assertRedirect();

    $character->refresh();

    expect($character->manual_adventures_count)->toBe(8)
        ->and($character->manual_faction_rank)->toBe(3);
});
