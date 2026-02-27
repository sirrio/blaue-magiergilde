<?php

use App\Models\Ally;
use App\Models\Character;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('stores allies for owned characters', function () {
    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create();

    $response = $this->actingAs($owner)->post(route('allies.store'), [
        'character_id' => $character->id,
        'name' => 'Mika',
        'rating' => 4,
        'notes' => 'Test note',
        'species' => 'Elf',
        'classes' => 'Wizard',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('allies', [
        'character_id' => $character->id,
        'name' => 'Mika',
        'rating' => 4,
        'notes' => 'Test note',
    ]);
});

it('validates character id when storing allies', function () {
    $owner = User::factory()->create();

    $response = $this->actingAs($owner)->from(route('characters.index'))->post(route('allies.store'), [
        'name' => 'Mika',
        'rating' => 4,
    ]);

    $response->assertRedirect(route('characters.index'));
    $response->assertSessionHasErrors(['character_id']);
    $this->assertDatabaseCount('allies', 0);
});

it('forbids storing allies on another users character', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherCharacter = Character::factory()->for($otherUser)->create();

    $this->actingAs($owner)->post(route('allies.store'), [
        'character_id' => $otherCharacter->id,
        'name' => 'Mika',
        'rating' => 4,
    ])->assertForbidden();
});

it('forbids updating allies on another users character', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherCharacter = Character::factory()->for($otherUser)->create();
    $ally = Ally::factory()->create(['character_id' => $otherCharacter->id]);

    $this->actingAs($owner)->put(route('allies.update', $ally), [
        'name' => 'Updated',
        'rating' => 5,
    ])->assertForbidden();
});

it('forbids deleting allies on another users character', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $otherCharacter = Character::factory()->for($otherUser)->create();
    $ally = Ally::factory()->create(['character_id' => $otherCharacter->id]);

    $this->actingAs($owner)->delete(route('allies.destroy', $ally))->assertForbidden();
});
