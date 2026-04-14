<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\User;
use App\Support\LevelProgression;

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

    // Pseudo uses target_level directly, duration is 0.
    expect($pseudo)->not->toBeNull();
    expect($pseudo->duration)->toBe(0);
    expect($pseudo->target_level)->toBe(3);
    expect($pseudo->progression_version_id)->toBe(LevelProgression::activeVersionId());

    // Setting level to 2 — pseudo updates its target_level.
    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 2,
    ])->assertRedirect();

    $updatedPseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->whereNull('deleted_at')
        ->first();

    expect($updatedPseudo)->not->toBeNull();
    expect($updatedPseudo->duration)->toBe(0);
    expect($updatedPseudo->target_level)->toBe(2);

    // Setting level to 1 should remove the pseudo entirely.
    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 1,
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
    expect($pseudo->duration)->toBe(0);
    expect($pseudo->target_level)->toBe(12);
    expect($pseudo->progression_version_id)->toBe(LevelProgression::activeVersionId());
});

it('ignores real adventures before the last pseudo for the minimum level floor', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    // 10 real adventures (10 bubbles) before the pseudo
    for ($i = 0; $i < 10; $i++) {
        Adventure::factory()->create([
            'character_id' => $character->id,
            'duration' => 10800,
            'has_additional_bubble' => false,
            'is_pseudo' => false,
            'start_date' => '2026-01-01',
        ]);
    }

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 8,
    ])->assertRedirect();

    // Now set level DOWN to 2 — the 10 real adventures before the pseudo should
    // NOT enforce a floor, so this must succeed.
    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 2,
    ])->assertRedirect();

    $updatedPseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->whereNull('deleted_at')
        ->first();

    expect($updatedPseudo)->not->toBeNull();
    expect($updatedPseudo->target_level)->toBe(2);
});

it('counts real adventures after the last pseudo towards the minimum level', function () {
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
        'level' => 3,
    ])->assertRedirect();

    // Add 10 real adventures AFTER the pseudo (10 bubbles → level 5 floor)
    for ($i = 0; $i < 10; $i++) {
        Adventure::factory()->create([
            'character_id' => $character->id,
            'duration' => 10800,
            'has_additional_bubble' => false,
            'is_pseudo' => false,
            'start_date' => '2099-01-01',
        ]);
    }

    // Trying to set level 2 should fail because 10 real bubbles after pseudo = level 5 floor
    $response = $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 2,
    ]);

    $response->assertSessionHasErrors('level');
});
