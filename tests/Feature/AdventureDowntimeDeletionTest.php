<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use App\Models\User;

test('a user can delete an adventure from the web route', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $user->id]);
    $adventure = Adventure::factory()->create(['character_id' => $character->id]);

    $response = $this->actingAs($user)->delete(route('adventures.destroy', $adventure));

    $response->assertRedirect();
    $this->assertSoftDeleted('adventures', ['id' => $adventure->id]);
});

test('a user can delete a downtime from the web route', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $user->id]);
    $downtime = Downtime::factory()->create(['character_id' => $character->id]);

    $response = $this->actingAs($user)->delete(route('downtimes.destroy', $downtime));

    $response->assertRedirect();
    $this->assertSoftDeleted('downtimes', ['id' => $downtime->id]);
});
