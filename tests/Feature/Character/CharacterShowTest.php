<?php

use App\Models\AdminAuditLog;
use App\Models\Adventure;
use App\Models\Ally;
use App\Models\Character;
use App\Models\User;
use App\Support\LevelProgression;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shows the character detail page for the owner', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();

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

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.adventures.0.title', 'Into the Blue')
            ->where('character.adventures.0.allies.0.id', $ally->id)
            ->where('character.adventures.0.allies.0.name', $linkedCharacter->name));
});

it('includes pseudo adventure anchor metadata on the character detail payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();
    $pseudoAdventure = Adventure::factory()->for($character)->create([
        'title' => 'Level tracking adjustment',
        'is_pseudo' => true,
        'target_level' => 7,
        'progression_version_id' => LevelProgression::activeVersionId(),
    ]);

    $this->actingAs($user)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('character.adventures.0.id', $pseudoAdventure->id)
            ->where('character.adventures.0.target_level', 7)
            ->where('character.adventures.0.progression_version_id', LevelProgression::activeVersionId()));
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
