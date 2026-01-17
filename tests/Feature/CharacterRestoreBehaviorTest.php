<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use App\Models\User;

use function Pest\Laravel\actingAs;

it('restores only adventures and downtimes deleted with the character', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();

    $activeAdventure = Adventure::factory()->create(['character_id' => $character->id]);
    $previouslyDeletedAdventure = Adventure::factory()->create(['character_id' => $character->id]);
    $previouslyDeletedAdventure->delete();

    $activeDowntime = Downtime::factory()->create(['character_id' => $character->id]);
    $previouslyDeletedDowntime = Downtime::factory()->create(['character_id' => $character->id]);
    $previouslyDeletedDowntime->delete();

    actingAs($user)->delete(route('characters.destroy', $character));

    $activeAdventure->refresh();
    $activeDowntime->refresh();
    $character->refresh();

    expect($activeAdventure->trashed())->toBeTrue()
        ->and($activeAdventure->deleted_by_character)->toBeTrue()
        ->and($activeDowntime->trashed())->toBeTrue()
        ->and($activeDowntime->deleted_by_character)->toBeTrue()
        ->and($character->trashed())->toBeTrue();

    actingAs($user)->post(route('characters.restore-deleted', $character));

    $activeAdventure->refresh();
    $previouslyDeletedAdventure->refresh();
    $activeDowntime->refresh();
    $previouslyDeletedDowntime->refresh();
    $character->refresh();

    expect($activeAdventure->trashed())->toBeFalse()
        ->and($activeAdventure->deleted_by_character)->toBeFalse()
        ->and($previouslyDeletedAdventure->trashed())->toBeTrue()
        ->and($previouslyDeletedAdventure->deleted_by_character)->toBeFalse()
        ->and($activeDowntime->trashed())->toBeFalse()
        ->and($activeDowntime->deleted_by_character)->toBeFalse()
        ->and($previouslyDeletedDowntime->trashed())->toBeTrue()
        ->and($previouslyDeletedDowntime->deleted_by_character)->toBeFalse()
        ->and($character->trashed())->toBeFalse();
});
