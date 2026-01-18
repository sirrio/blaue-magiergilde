<?php

use App\Models\Character;
use App\Models\User;

it('updates simplified level when simplified tracking is enabled', function () {
    $user = User::factory()->create(['simplified_tracking' => true]);
    $character = Character::factory()->for($user)->create();

    $response = $this->actingAs($user)->patch(route('characters.simplified-level', $character), [
        'simplified_level' => 8,
    ]);

    $response->assertRedirect();
    expect($character->refresh()->simplified_level)->toBe(8);
});

it('forbids simplified level updates when simplified tracking is disabled', function () {
    $user = User::factory()->create(['simplified_tracking' => false]);
    $character = Character::factory()->for($user)->create();

    $this->actingAs($user)
        ->patch(route('characters.simplified-level', $character), [
            'simplified_level' => 4,
        ])
        ->assertForbidden();

    expect($character->refresh()->simplified_level)->toBeNull();
});
