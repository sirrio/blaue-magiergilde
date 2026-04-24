<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shows permanent delete availability only for deleted characters without tracking relevance', function () {
    $user = User::factory()->create();

    $eligibleCharacter = Character::factory()->for($user)->create();
    $eligibleAdventure = Adventure::factory()->for($eligibleCharacter)->create();
    $eligibleDowntime = Downtime::factory()->for($eligibleCharacter)->create();
    $eligibleAdventure->delete();
    $eligibleDowntime->delete();
    recordCharacterSnapshot($eligibleCharacter);
    $eligibleCharacter->delete();

    $ineligibleCharacter = Character::factory()->for($user)->create();
    app(\App\Support\CharacterAuditTrail::class)->record($ineligibleCharacter, 'dm_bubbles.granted', delta: ['bubbles' => 1, 'dm_bubbles' => 1]);
    Adventure::factory()->for($ineligibleCharacter)->create();
    recordCharacterSnapshot($ineligibleCharacter);
    $ineligibleCharacter->delete();

    $this->actingAs($user)
        ->get(route('characters.deleted'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/deleted')
            ->has('characters', 2)
            ->where('characters', function ($characters) use ($eligibleCharacter, $ineligibleCharacter): bool {
                $eligible = collect($characters)->firstWhere('id', $eligibleCharacter->id);
                $ineligible = collect($characters)->firstWhere('id', $ineligibleCharacter->id);

                return (bool) $eligible
                    && (bool) $ineligible
                    && $eligible['can_force_delete'] === true
                    && $ineligible['can_force_delete'] === false;
            }));
});
