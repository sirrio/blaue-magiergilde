<?php

use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\CharacterBubbleShopPurchase;
use App\Models\CharacterClass;
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

    $auditEvent = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'character.guild_status_updated')
        ->first();

    expect($auditEvent)->not->toBeNull()
        ->and($auditEvent?->actor_user_id)->toBe($admin->id)
        ->and($auditEvent?->metadata)->toMatchArray([
            'field' => 'guild_status',
            'via' => 'admin-approval',
        ])
        ->and($auditEvent?->state_after['guild_status'] ?? null)->toBe('approved');
});

it('stores full state snapshots and separate audit events for admin approval changes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $characterClassA = CharacterClass::factory()->create();
    $characterClassB = CharacterClass::factory()->create();

    $character = Character::factory()->create([
        'guild_status' => 'pending',
        'name' => 'Snapshot Mage',
        'external_link' => 'https://www.dndbeyond.com/characters/1234',
        'avatar' => 'avatars/snapshot.png',
        'avatar_masked' => false,
        'private_mode' => true,
        'start_tier' => 'lt',
        'version' => '2024',
        'notes' => 'Current notes',
        'registration_note' => 'Please review',
        'review_note' => null,
        'admin_notes' => null,
        'is_filler' => true,
        'admin_managed' => true,
        'simplified_tracking' => true,
        'manual_adventures_count' => 7,
        'manual_faction_rank' => 3,
    ]);
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 4, 'dm_bubbles' => 4]);
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'dm_coins.granted', delta: ['dm_coins' => 2]);
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'bubble_shop.updated', delta: ['bubbles' => -5, 'bubble_shop_spend' => 5], metadata: [
        'previous_quantities' => [
            'skill_proficiency' => 0,
            'rare_language' => 0,
            'tool_or_language' => 0,
            'downtime' => 0,
        ],
        'new_quantities' => [
            'skill_proficiency' => 0,
            'rare_language' => 0,
            'tool_or_language' => 0,
            'downtime' => 2,
        ],
    ]);
    $character->characterClasses()->sync([$characterClassB->id, $characterClassA->id]);
    CharacterBubbleShopPurchase::factory()->for($character)->create([
        'type' => 'downtime',
        'quantity' => 2,
        'details' => ['source' => 'existing'],
    ]);

    $this->actingAs($admin)
        ->patch('/admin/character-approvals/characters/'.$character->id, [
            'guild_status' => 'declined',
            'review_note' => 'Missing details',
            'admin_notes' => 'Needs manual follow-up',
        ])
        ->assertRedirect();

    $events = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->whereIn('action', [
            'character.guild_status_updated',
            'character.review_note_updated',
            'character.admin_notes_updated',
        ])
        ->orderBy('id')
        ->get();

    expect($events->pluck('action')->all())->toBe([
        'character.guild_status_updated',
        'character.review_note_updated',
        'character.admin_notes_updated',
    ]);

    $snapshot = $events->last()?->state_after;

    expect($snapshot)->toBeArray()
        ->and($snapshot['name'] ?? null)->toBe('Snapshot Mage')
        ->and($snapshot['external_link'] ?? null)->toBe('https://www.dndbeyond.com/characters/1234')
        ->and($snapshot['avatar'] ?? null)->toBe('avatars/snapshot.png')
        ->and($snapshot['avatar_masked'] ?? null)->toBeFalse()
        ->and($snapshot['private_mode'] ?? null)->toBeTrue()
        ->and($snapshot['start_tier'] ?? null)->toBe('lt')
        ->and($snapshot['version'] ?? null)->toBe('2024')
        ->and($snapshot['notes'] ?? null)->toBe('Current notes')
        ->and($snapshot['registration_note'] ?? null)->toBe('Please review')
        ->and($snapshot['review_note'] ?? null)->toBe('Missing details')
        ->and($snapshot['admin_notes'] ?? null)->toBe('Needs manual follow-up')
        ->and($snapshot['is_filler'] ?? null)->toBeTrue()
        ->and($snapshot['admin_managed'] ?? null)->toBeTrue()
        ->and($snapshot['simplified_tracking'] ?? null)->toBeTrue()
        ->and($snapshot['manual_adventures_count'] ?? null)->toBe(7)
        ->and($snapshot['manual_faction_rank'] ?? null)->toBe(3)
        ->and($snapshot['class_ids'] ?? null)->toBe([$characterClassA->id, $characterClassB->id])
        ->and($snapshot['bubble_shop_purchases']['downtime']['quantity'] ?? null)->toBe(2)
        ->and($snapshot['bubble_shop_purchases']['downtime']['details'] ?? null)->toBeNull();
});

it('includes simplified tracking flag for character approvals', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();
    recordCharacterSnapshot(Character::factory()->for($user)->create(['simplified_tracking' => true]));

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->where('characters.0.simplified_tracking', true));
});

it('marks first submitted characters in character approvals', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $firstUser = User::factory()->create(['name' => 'Alpha User']);
    $secondUser = User::factory()->create(['name' => 'Bravo User']);

    recordCharacterSnapshot(Character::factory()->for($firstUser)->create(['guild_status' => 'pending']));
    recordCharacterSnapshot(Character::factory()->for($secondUser)->create(['guild_status' => 'pending']));
    recordCharacterSnapshot(Character::factory()->for($secondUser)->create(['guild_status' => 'approved']));

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->where('characters.0.is_first_submission', true)
            ->where('characters.1.is_first_submission', false));
});

it('includes spent dm bubbles and coins in character approvals payload', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $character = Character::factory()->for($user)->create();
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 3, 'dm_bubbles' => 3]);
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'dm_coins.granted', delta: ['dm_coins' => 2]);
    recordCharacterSnapshot($character);

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->where('characters.0.progression_state.dm_bubbles', 3)
            ->where('characters.0.progression_state.dm_coins', 2));
});

it('includes users without characters in empty users list', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    recordCharacterSnapshot(Character::factory()->for($admin)->create());

    $emptyUser = User::factory()->create([
        'name' => 'No Characters Yet',
        'discord_username' => 'empty-user',
    ]);
    $userWithCharacter = User::factory()->create();
    recordCharacterSnapshot(Character::factory()->for($userWithCharacter)->create());

    $this->actingAs($admin)
        ->get('/admin/character-approvals')
        ->assertInertia(fn (Assert $page) => $page
            ->has('emptyUsers', 1)
            ->where('emptyUsers.0.id', $emptyUser->id)
            ->where('emptyUsers.0.discord_username', 'empty-user'));
});

it('does not include empty users when status filter is active', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    recordCharacterSnapshot(Character::factory()->for($admin)->create(['guild_status' => 'pending']));

    User::factory()->create([
        'name' => 'No Characters Yet',
    ]);

    $reviewUser = User::factory()->create();
    recordCharacterSnapshot(Character::factory()->for($reviewUser)->create(['guild_status' => 'pending']));

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
        recordCharacterSnapshot(Character::factory()->for($approvalUser)->create([
            'name' => sprintf('Character %02d', $index + 1),
            'guild_status' => 'pending',
        ]));
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
