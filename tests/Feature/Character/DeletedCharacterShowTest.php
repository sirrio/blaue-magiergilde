<?php

use App\Models\Adventure;
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
