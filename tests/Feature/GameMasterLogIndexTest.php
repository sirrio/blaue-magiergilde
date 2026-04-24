<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Game;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns a slimmed character payload for game master log index', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();
    Adventure::factory()->for($character)->create();
    Game::factory()->create(['user_id' => $user->id]);
    recordCharacterSnapshot($character);

    $response = $this->actingAs($user)
        ->get(route('game-master-log.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $characters = $props['characters'] ?? [];
    $payloadCharacter = $characters[0] ?? null;

    expect($payloadCharacter)->toBeArray();
    expect($payloadCharacter)->toHaveKey('adventures');
    expect($payloadCharacter)->not->toHaveKey('allies');
    expect($payloadCharacter)->not->toHaveKey('downtimes');
    expect($payloadCharacter)->not->toHaveKey('character_classes');
    expect($payloadCharacter)->not->toHaveKey('faction_rank');
});

it('does not include deleted adventures in the game master log character payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'is_filler' => true,
    ]);

    $activeAdventure = Adventure::factory()->for($character)->create([
        'duration' => 10800,
        'has_additional_bubble' => false,
    ]);
    $deletedAdventure = Adventure::factory()->for($character)->create([
        'duration' => 10800,
        'has_additional_bubble' => false,
    ]);
    $deletedAdventure->delete();
    recordCharacterSnapshot($character);

    $response = $this->actingAs($user)
        ->get(route('game-master-log.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $characters = $props['characters'] ?? [];
    $payloadCharacter = collect($characters)->firstWhere('id', $character->id);

    expect($payloadCharacter)->toBeArray();
    expect($payloadCharacter['adventures'])->toHaveCount(1);
    expect(collect($payloadCharacter['adventures'])->pluck('id')->all())->toBe([$activeAdventure->id]);
});

it('keeps deleted characters in the game master log payload for existing spends', function () {
    $user = User::factory()->create();
    $activeCharacter = Character::factory()->for($user)->create();
    $deletedCharacter = Character::factory()->for($user)->create();
    app(\App\Support\CharacterAuditTrail::class)->record($deletedCharacter, 'dm_bubbles.granted', delta: ['bubbles' => 3, 'dm_bubbles' => 3]);
    app(\App\Support\CharacterAuditTrail::class)->record($deletedCharacter, 'dm_coins.granted', delta: ['dm_coins' => 2]);
    recordCharacterSnapshot($activeCharacter);
    $deletedCharacter->delete();
    recordCharacterSnapshot($deletedCharacter);

    $response = $this->actingAs($user)
        ->get(route('game-master-log.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $characters = collect($props['characters'] ?? []);

    expect($characters->pluck('id')->all())
        ->toContain($activeCharacter->id)
        ->toContain($deletedCharacter->id);

    $payloadCharacter = $characters->firstWhere('id', $deletedCharacter->id);

    expect($payloadCharacter)->toBeArray();
    expect($payloadCharacter['progression_state']['dm_bubbles'] ?? null)->toBe(3);
    expect($payloadCharacter['progression_state']['dm_coins'] ?? null)->toBe(2);
});

it('keeps only character-deletion adventures for deleted characters in the game master log payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'is_filler' => true,
    ]);
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 1, 'dm_bubbles' => 1]);

    $stillActiveAdventure = Adventure::factory()->for($character)->create([
        'duration' => 10800,
        'has_additional_bubble' => false,
    ]);
    $deletedByCharacterAdventure = Adventure::factory()->for($character)->create([
        'duration' => 21600,
        'has_additional_bubble' => true,
    ]);
    $deletedByCharacterAdventure->deleted_by_character = true;
    $deletedByCharacterAdventure->save();
    $deletedByCharacterAdventure->delete();

    $manuallyDeletedAdventure = Adventure::factory()->for($character)->create([
        'duration' => 10800,
        'has_additional_bubble' => false,
    ]);
    $manuallyDeletedAdventure->delete();

    $character->delete();
    recordCharacterSnapshot($character);

    $response = $this->actingAs($user)
        ->get(route('game-master-log.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $characters = collect($props['characters'] ?? []);
    $payloadCharacter = $characters->firstWhere('id', $character->id);

    expect($payloadCharacter)->toBeArray();
    expect(collect($payloadCharacter['adventures'])->pluck('id')->all())
        ->toContain($stillActiveAdventure->id)
        ->toContain($deletedByCharacterAdventure->id)
        ->not->toContain($manuallyDeletedAdventure->id);
});
