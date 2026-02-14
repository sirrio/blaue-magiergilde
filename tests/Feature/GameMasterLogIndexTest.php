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
