<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\User;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterProgressionState;

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

it('does not create a level anchor when switching to level tracking without setting a level', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => false,
    ]);
    app(CharacterAuditTrail::class)->record($character, 'bubble_shop.updated', delta: ['bubbles' => -15, 'bubble_shop_spend' => 15]);

    foreach (range(1, 30) as $index) {
        Adventure::factory()->create([
            'character_id' => $character->id,
            'duration' => 10800,
            'has_additional_bubble' => false,
            'start_date' => sprintf('2026-01-%02d', min($index, 28)),
        ]);
    }

    $this->actingAs($user)->patch(route('characters.tracking', $character), [
        'simplified_tracking' => true,
    ])->assertRedirect();

    $duringManualMode = $character->fresh('adventures', 'auditEvents');

    expect($duringManualMode->simplified_tracking)->toBeTrue()
        ->and((new CharacterProgressionState)->hasLevelAnchor($duringManualMode))->toBeFalse();

    $this->actingAs($user)->patch(route('characters.tracking', $character), [
        'simplified_tracking' => false,
    ])->assertRedirect();

    $after = $character->fresh('adventures', 'auditEvents');

    expect($after->simplified_tracking)->toBeFalse()
        ->and((new CharacterProgressionState)->hasLevelAnchor($after))->toBeFalse();
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
        'is_filler' => false,
        'simplified_tracking' => false,
    ]);

    $response = $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 3,
    ]);

    $response->assertSessionHasErrors('level');
});

it('creates a level anchor for quick mode levels and blocks lowering below the current floor', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'has_additional_bubble' => false,
    ]);
    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 3,
    ])->assertRedirect();

    $levelSet = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    expect($levelSet)->not->toBeNull();
    expect($levelSet->delta['target_level'] ?? null)->toBe(3);

    $response = $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 2,
    ]);

    $response->assertSessionHasErrors('level');

    $levelSetCount = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->count();

    expect($levelSetCount)->toBe(1);
});

it('uses the seeded default progression for quick mode levels', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);
    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 12,
    ])->assertRedirect();

    $levelSet = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    expect($levelSet)->not->toBeNull();
    expect($levelSet->delta['target_level'] ?? null)->toBe(12);
});

it('uses the latest level anchor as the minimum level floor even if older real adventures exist', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    // 10 real adventures (10 bubbles) before the level anchor
    for ($i = 0; $i < 10; $i++) {
        Adventure::factory()->create([
            'character_id' => $character->id,
            'duration' => 10800,
            'has_additional_bubble' => false,
            'start_date' => '2026-01-01',
        ]);
    }
    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 8,
    ])->assertRedirect();

    $response = $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 2,
    ]);

    $response->assertSessionHasErrors('level');
});

it('counts real adventures after the last level anchor towards the minimum level', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create([
        'user_id' => $user->id,
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);
    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 3,
    ])->assertRedirect();

    // Add 10 real adventures AFTER the anchor (10 bubbles → level 5 floor)
    for ($i = 0; $i < 10; $i++) {
        Adventure::factory()->create([
            'character_id' => $character->id,
            'duration' => 10800,
            'has_additional_bubble' => false,
            'start_date' => '2099-01-01',
        ]);
    }
    recordCharacterSnapshot($character);

    // Trying to set level 2 should fail because 10 real bubbles after anchor = level 5 floor
    $response = $this->actingAs($user)->post(route('characters.quick-level', $character), [
        'level' => 2,
    ]);

    $response->assertSessionHasErrors('level');
});
