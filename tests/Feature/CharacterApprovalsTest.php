<?php

use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('allows admins to view the character list', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertOk();
});

it('logs an audit entry when admin updates guild status', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create(['guild_status' => 'pending']);

    $this->actingAs($admin)
        ->patch('/admin/character-approvals/characters/'.$character->id, [
            'guild_status' => 'approved',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('approved');

    $log = AdminAuditLog::query()
        ->where('action', 'character.guild_status.updated')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->subject_type)->toBe(Character::class);
    expect($log->subject_id)->toBe($character->id);
    expect($log->metadata)->toMatchArray([
        'from' => 'pending',
        'to' => 'approved',
    ]);
});

it('includes simplified tracking flag for character approvals', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();
    Character::factory()->for($user)->create(['simplified_tracking' => true]);

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->where('characters.0.simplified_tracking', true));
});

it('marks first submitted characters in character approvals', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $firstUser = User::factory()->create(['name' => 'Alpha User']);
    $secondUser = User::factory()->create(['name' => 'Bravo User']);

    Character::factory()->for($firstUser)->create(['guild_status' => 'pending']);
    Character::factory()->for($secondUser)->create(['guild_status' => 'pending']);
    Character::factory()->for($secondUser)->create(['guild_status' => 'approved']);

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->where('characters.0.is_first_submission', true)
            ->where('characters.1.is_first_submission', false));
});

it('includes spent dm bubbles and coins in character approvals payload', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    Character::factory()->for($user)->create([
        'dm_bubbles' => 3,
        'dm_coins' => 2,
    ]);

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->where('characters.0.dm_bubbles', 3)
            ->where('characters.0.dm_coins', 2));
});

it('includes users without characters in empty users list', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    Character::factory()->for($admin)->create();

    $emptyUser = User::factory()->create([
        'name' => 'No Characters Yet',
        'discord_username' => 'empty-user',
    ]);
    $userWithCharacter = User::factory()->create();
    Character::factory()->for($userWithCharacter)->create();

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->has('emptyUsers', 1)
            ->where('emptyUsers.0.id', $emptyUser->id)
            ->where('emptyUsers.0.discord_username', 'empty-user'));
});

it('does not include empty users when status filter is active', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    Character::factory()->for($admin)->create(['guild_status' => 'pending']);

    User::factory()->create([
        'name' => 'No Characters Yet',
    ]);

    $reviewUser = User::factory()->create();
    Character::factory()->for($reviewUser)->create(['guild_status' => 'pending']);

    $this->actingAs($admin)
        ->get('/admin/character-approvals?status=pending')
        ->assertInertia(fn (Assert $page) => $page
            ->has('emptyUsers', 0));
});

it('paginates character approvals by user', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $approvalUsers = collect(range(1, 11))
        ->map(fn (int $index) => User::factory()->create([
            'name' => sprintf('Approval User %02d', $index),
        ]));

    $approvalUsers->each(function (User $approvalUser, int $index) {
        Character::factory()->for($approvalUser)->create([
            'name' => sprintf('Character %02d', $index + 1),
            'guild_status' => 'pending',
        ]);
    });

    $this->actingAs($admin)
        ->get('/admin/character-approvals?status=pending')
        ->assertInertia(fn (Assert $page) => $page
            ->where('pagination.currentPage', 1)
            ->where('pagination.lastPage', 2)
            ->where('pagination.perPage', 10)
            ->where('pagination.total', 11)
            ->has('userOrder', 10)
            ->has('characters', 10));

    $this->actingAs($admin)
        ->get('/admin/character-approvals?status=pending&page=2')
        ->assertInertia(fn (Assert $page) => $page
            ->where('pagination.currentPage', 2)
            ->where('pagination.lastPage', 2)
            ->has('userOrder', 1)
            ->has('characters', 1)
            ->where('characters.0.user.name', 'Approval User 11'));
});

it('requires review note when marking a character as needs changes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create(['guild_status' => 'pending']);

    $this->actingAs($admin)
        ->patch('/admin/character-approvals/characters/'.$character->id, [
            'guild_status' => 'needs_changes',
        ])
        ->assertSessionHasErrors('review_note');

    $character->refresh();
    expect($character->guild_status)->toBe('pending')
        ->and($character->review_note)->toBeNull();
});

it('stores review note when marking a character as declined', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create(['guild_status' => 'pending']);

    $this->actingAs($admin)
        ->patch('/admin/character-approvals/characters/'.$character->id, [
            'guild_status' => 'declined',
            'review_note' => 'Missing required details for approval.',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('declined')
        ->and($character->review_note)->toBe('Missing required details for approval.');
});

it('requires pending status before applying review decisions', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create(['guild_status' => 'needs_changes']);

    $this->actingAs($admin)
        ->patch('/admin/character-approvals/characters/'.$character->id, [
            'guild_status' => 'approved',
        ])
        ->assertSessionHasErrors('guild_status');

    $character->refresh();
    expect($character->guild_status)->toBe('needs_changes');
});
