<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\User;

it('updates tracking mode for an owned character', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'simplified_tracking' => false,
    ]);

    $response = $this->actingAs($user)->patch(route('characters.tracking', $character), [
        'simplified_tracking' => true,
    ]);

    $response->assertRedirect();
    expect($character->fresh()->simplified_tracking)->toBeTrue();
});

it('forbids changing tracking mode on foreign characters', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $owner->id,
        'simplified_tracking' => false,
    ]);

    $response = $this->actingAs($otherUser)->patch(route('characters.tracking', $character), [
        'simplified_tracking' => true,
    ]);

    $response->assertForbidden();
    expect($character->fresh()->simplified_tracking)->toBeFalse();
});

it('blocks quick level updates when simplified tracking is disabled', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
        'simplified_tracking' => false,
    ]);

    $response = $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 3,
    ]);

    $response->assertSessionHasErrors('level');
});

it('creates and removes pseudo adventures for quick mode levels', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
    ]);

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 3,
    ])->assertRedirect();

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->whereNull('deleted_at')
        ->first();

    expect($pseudo)->not->toBeNull();
    expect($pseudo->duration)->toBe(21600);

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 2,
    ])->assertRedirect();

    $remainingPseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->whereNull('deleted_at')
        ->count();

    expect($remainingPseudo)->toBe(0);
});

it('uses the seeded default progression for quick mode levels', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 12,
    ])->assertRedirect();

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->whereNull('deleted_at')
        ->first();

    expect($pseudo)->not->toBeNull();
    expect($pseudo->duration)->toBe(66 * 10800);
});
