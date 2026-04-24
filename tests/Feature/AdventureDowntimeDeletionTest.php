<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\Downtime;
use App\Models\User;

test('a user can delete an adventure from the web route', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $user->id]);
    $adventure = Adventure::factory()->create(['character_id' => $character->id]);

    $response = $this->actingAs($user)->delete(route('adventures.destroy', $adventure));

    $response->assertRedirect();
    $this->assertSoftDeleted('adventures', ['id' => $adventure->id]);
    $this->assertDatabaseHas('character_audit_events', [
        'character_id' => $character->id,
        'action' => 'adventure.deleted',
        'subject_id' => $adventure->id,
    ]);
    expect(CharacterAuditEvent::query()->where('action', 'adventure.deleted')->first()?->state_after)->toBeArray();
});

test('a user can delete a downtime from the web route', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $user->id]);
    $downtime = Downtime::factory()->create(['character_id' => $character->id]);

    $response = $this->actingAs($user)->delete(route('downtimes.destroy', $downtime));

    $response->assertRedirect();
    $this->assertSoftDeleted('downtimes', ['id' => $downtime->id]);
    $this->assertDatabaseHas('character_audit_events', [
        'character_id' => $character->id,
        'action' => 'downtime.deleted',
        'subject_id' => $downtime->id,
    ]);
    expect(CharacterAuditEvent::query()->where('action', 'downtime.deleted')->first()?->state_after)->toBeArray();
});
