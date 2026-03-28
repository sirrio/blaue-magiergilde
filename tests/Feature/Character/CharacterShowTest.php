<?php

use App\Models\AdminAuditLog;
use App\Models\Ally;
use App\Models\Character;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->where('character.id', $character->id));
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
