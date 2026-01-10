<?php

use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

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
