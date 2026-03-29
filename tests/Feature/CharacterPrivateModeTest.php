<?php

use App\Models\Character;
use App\Models\User;

it('updates private mode for an owned character', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'private_mode' => false,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.private-mode', $character), [
        'private_mode' => true,
    ]);

    $response->assertRedirect();

    expect($character->fresh()->private_mode)->toBeTrue();
});

it('forbids changing private mode on foreign characters', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $owner->id,
        'private_mode' => false,
    ]);

    $response = $this->actingAs($otherUser)->patch(route('characters.private-mode', $character), [
        'private_mode' => true,
    ]);

    $response->assertForbidden();

    expect($character->fresh()->private_mode)->toBeFalse();
});

it('validates private mode payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'private_mode' => false,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.private-mode', $character), [
        'private_mode' => 'invalid',
    ]);

    $response->assertSessionHasErrors('private_mode');
});
