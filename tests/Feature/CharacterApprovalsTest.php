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
