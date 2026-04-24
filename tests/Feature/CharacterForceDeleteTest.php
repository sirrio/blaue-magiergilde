<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('permanently deletes an eligible deleted character', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();

    $adventure = Adventure::factory()->for($character)->create();
    $downtime = Downtime::factory()->for($character)->create();
    $adventure->delete();
    $downtime->delete();
    $character->delete();

    $this->actingAs($user)
        ->delete(route('characters.force-delete', $character))
        ->assertRedirect(route('characters.deleted'));

    $this->assertDatabaseMissing('characters', ['id' => $character->id]);
    $this->assertDatabaseMissing('adventures', ['id' => $adventure->id]);
    $this->assertDatabaseMissing('downtimes', ['id' => $downtime->id]);
});

it('does not permanently delete a deleted character with tracking relevance', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();

    Adventure::factory()->for($character)->create();
    $character->delete();

    $this->actingAs($user)
        ->from(route('characters.deleted'))
        ->delete(route('characters.force-delete', $character))
        ->assertRedirect(route('characters.deleted'))
        ->assertSessionHasErrors('character');

    $this->assertSoftDeleted('characters', ['id' => $character->id]);
});
