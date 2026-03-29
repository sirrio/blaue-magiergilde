<?php

use App\Models\Adventure;
use App\Models\Ally;
use App\Models\Character;
use App\Models\Downtime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shows deleted character details in read only mode for the owner', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();
    $adventure = Adventure::factory()->for($character)->create();
    $downtime = Downtime::factory()->for($character)->create();
    $manuallyDeletedAdventure = Adventure::factory()->for($character)->create();
    $manuallyDeletedDowntime = Downtime::factory()->for($character)->create();

    $manuallyDeletedAdventure->delete();
    $manuallyDeletedDowntime->delete();
    $character->delete();

    $this->actingAs($user)
        ->get(route('characters.deleted.show', $character->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('readOnly', true)
            ->where('character.id', $character->id)
            ->has('character.adventures', 1)
            ->has('character.downtimes', 1)
            ->where('character.adventures.0.id', $adventure->id)
            ->where('character.downtimes.0.id', $downtime->id));
});

it('forbids access to deleted character details for non owners', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->for($owner)->create();

    $character->delete();

    $this->actingAs($otherUser)
        ->get(route('characters.deleted.show', $character->id))
        ->assertForbidden();
});

it('hides private linked character avatars on deleted character detail page', function () {
    $viewer = User::factory()->create();
    $privateOwner = User::factory()->create();
    $deletedCharacter = Character::factory()->for($viewer)->create();
    $privateCharacter = Character::factory()->for($privateOwner)->create([
        'private_mode' => true,
        'avatar' => 'avatars/private.png',
    ]);

    Ally::factory()->create([
        'character_id' => $deletedCharacter->id,
        'name' => $privateCharacter->name,
        'rating' => 3,
        'linked_character_id' => $privateCharacter->id,
    ]);
    $deletedCharacter->delete();

    $this->actingAs($viewer)
        ->get(route('characters.deleted.show', $deletedCharacter->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.allies.0.linked_character.avatar', '')
            ->missing('character.allies.0.linked_character.private_mode')
            ->missing('character.allies.0.linked_character.user_id'));
});
