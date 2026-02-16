<?php

use App\Models\Character;
use App\Models\User;

it('updates avatar mode for an owned character', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'avatar_masked' => true,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.avatar-mode', $character), [
        'avatar_masked' => false,
    ]);

    $response->assertRedirect();

    expect($character->fresh()->avatar_masked)->toBeFalse();
});

it('forbids changing avatar mode on foreign characters', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $owner->id,
        'avatar_masked' => true,
    ]);

    $response = $this->actingAs($otherUser)->patch(route('characters.avatar-mode', $character), [
        'avatar_masked' => false,
    ]);

    $response->assertForbidden();
    expect($character->fresh()->avatar_masked)->toBeTrue();
});

it('validates avatar mode payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'avatar_masked' => true,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.avatar-mode', $character), [
        'avatar_masked' => 'invalid',
    ]);

    $response->assertSessionHasErrors('avatar_masked');
});
