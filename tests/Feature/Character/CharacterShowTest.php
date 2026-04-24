<?php

use App\Models\AdminAuditLog;
use App\Models\Adventure;
use App\Models\Ally;
use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\User;
use App\Support\LevelProgression;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shows the character detail page for the owner', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();
    recordCharacterSnapshot($character);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('activeLevelProgressionVersionId', LevelProgression::activeVersionId())
            ->where('character.id', $character->id)
            ->has('guildCharacters'));
});

it('shares the beta progression upgrade flag only for allowlisted users', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();
    recordCharacterSnapshot($character);

    Config::set('features.level_curve_upgrade_user_ids', [$user->id]);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('features.level_curve_upgrade', true));

    Config::set('features.level_curve_upgrade_user_ids', []);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('features.level_curve_upgrade', false));
});

it('includes reviewed by name on character detail payload', function () {
    $owner = User::factory()->create();
    $reviewer = User::factory()->create([
        'name' => 'Approval Reviewer',
    ]);
    $character = Character::factory()
        ->for($owner)
        ->create([
            'guild_status' => 'needs_changes',
        ]);
    recordCharacterSnapshot($character);

    AdminAuditLog::query()->create([
        'actor_user_id' => $reviewer->id,
        'action' => 'character.guild_status.updated',
        'subject_type' => Character::class,
        'subject_id' => $character->id,
        'metadata' => [
            'from' => 'pending',
            'to' => 'needs_changes',
        ],
    ]);

    $this->actingAs($owner)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.reviewed_by_name', 'Approval Reviewer'));
});

it('hides private linked character avatars from other users on character detail page', function () {
    $viewer = User::factory()->create();
    $privateOwner = User::factory()->create();
    $viewerCharacter = Character::factory()->for($viewer)->create();
    $privateCharacter = Character::factory()->for($privateOwner)->create([
        'private_mode' => true,
        'avatar' => 'avatars/private.png',
    ]);
    recordCharacterSnapshot($viewerCharacter);
    recordCharacterSnapshot($privateCharacter);

    Ally::factory()->create([
        'character_id' => $viewerCharacter->id,
        'name' => $privateCharacter->name,
        'rating' => 3,
        'linked_character_id' => $privateCharacter->id,
    ]);

    $this->actingAs($viewer)
        ->get(route('characters.show', $viewerCharacter))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.allies.0.linked_character.avatar', '')
            ->missing('character.allies.0.linked_character.private_mode')
            ->missing('character.allies.0.linked_character.user_id'));
});

it('includes adventure participants on the character detail payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();
    $linkedCharacter = Character::factory()->create([
        'name' => 'Temptation',
    ]);
    $ally = Ally::factory()->create([
        'character_id' => $character->id,
        'name' => $linkedCharacter->name,
        'linked_character_id' => $linkedCharacter->id,
    ]);
    $adventure = Adventure::factory()->for($character)->create([
        'title' => 'Into the Blue',
    ]);

    $adventure->allies()->attach($ally->id);
    recordCharacterSnapshot($character);
    recordCharacterSnapshot($linkedCharacter);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.adventures.0.title', 'Into the Blue')
            ->where('character.adventures.0.allies.0.id', $ally->id)
            ->where('character.adventures.0.allies.0.name', $linkedCharacter->name));
});

it('includes backfilled progression audit events on the character detail payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();

    CharacterAuditEvent::factory()->for($character)->create([
        'action' => 'dm_bubbles.updated',
        'delta' => ['bubbles' => 3, 'dm_bubbles' => 3],
        'metadata' => ['backfilled' => true, 'hidden_from_history' => true],
    ]);
    recordCharacterSnapshot($character);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.audit_events.0.action', 'test.snapshot')
            ->where('character.audit_events.1.action', 'dm_bubbles.updated')
            ->where('character.audit_events.1.delta.bubbles', 3)
            ->where('character.audit_events.1.metadata.backfilled', true));
});

it('includes character audit events on the character detail payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();

    CharacterAuditEvent::factory()->for($character)->create([
        'actor_user_id' => $user->id,
        'action' => 'adventure.created',
        'delta' => ['bubbles' => 2],
        'state_after' => [
            'level' => 3,
            'tier' => 'bt',
            'available_bubbles' => 3,
            'bubbles_in_level' => 0,
            'bubbles_required_for_next_level' => 3,
            'downtime_total_seconds' => 0,
            'downtime_logged_seconds' => 0,
            'faction_rank' => 0,
        ],
        'metadata' => ['title' => 'Blue Road'],
    ]);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.audit_events.0.action', 'adventure.created')
            ->where('character.audit_events.0.delta.bubbles', 2)
            ->where('character.audit_events.0.state_after.level', 3)
            ->where('character.audit_events.0.actor.name', $user->name));
});

it('keeps deleted linked allies as snapshots on the character detail payload', function () {
    $user = User::factory()->create();
    $linkedOwner = User::factory()->create([
        'name' => 'Linked Owner',
    ]);
    $character = Character::factory()->for($user)->create();
    $linkedCharacter = Character::factory()->for($linkedOwner)->create([
        'name' => 'Archived Ally',
    ]);
    recordCharacterSnapshot($character);
    recordCharacterSnapshot($linkedCharacter);

    $ally = Ally::factory()->create([
        'character_id' => $character->id,
        'name' => $linkedCharacter->name,
        'linked_character_id' => $linkedCharacter->id,
    ]);

    $linkedCharacter->delete();

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.allies.0.id', $ally->id)
            ->where('character.allies.0.name', 'Archived Ally')
            ->where('character.allies.0.linked_character_id', $linkedCharacter->id)
            ->where('character.allies.0.linked_character', null));
});
