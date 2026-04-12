<?php

use App\Models\Character;
use App\Models\User;

it('requires a value when enabling a total downtime override', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();

    $response = $this->actingAs($user)->from(route('characters.show', $character))->patch(route('characters.manual-overrides', $character), [
        'manual_total_downtime_enabled' => 1,
    ]);

    $response->assertRedirect(route('characters.show', $character));
    $response->assertSessionHasErrors('manual_total_downtime_seconds');
});

it('preserves unrelated manual overrides when updating faction rank only', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'manual_adventures_count' => 7,
        'manual_faction_rank' => 2,
        'manual_total_downtime_seconds' => 21600,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.manual-overrides', $character), [
        'manual_faction_rank_enabled' => true,
        'manual_faction_rank' => 4,
    ]);

    $response->assertRedirect();

    $character->refresh();

    expect($character->manual_adventures_count)->toBe(7)
        ->and($character->manual_faction_rank)->toBe(4)
        ->and($character->manual_total_downtime_seconds)->toBe(21600);
});

it('preserves unrelated manual overrides when updating total downtime only', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'manual_adventures_count' => 5,
        'manual_faction_rank' => 3,
        'manual_total_downtime_seconds' => 14400,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.manual-overrides', $character), [
        'manual_total_downtime_enabled' => true,
        'manual_total_downtime_seconds' => 28800,
    ]);

    $response->assertRedirect();

    $character->refresh();

    expect($character->manual_adventures_count)->toBe(5)
        ->and($character->manual_faction_rank)->toBe(3)
        ->and($character->manual_total_downtime_seconds)->toBe(28800);
});
