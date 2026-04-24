<?php

use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\User;
use App\Support\CharacterAuditTrail;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows admins to create characters for users', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    $payload = [
        'name' => 'Admin Created',
        'class' => [$class->id],
        'external_link' => 'https://www.dndbeyond.com/characters/1111111',
        'start_tier' => 'bt',
        'version' => '2024',
        'dm_bubbles' => 2,
        'dm_coins' => 1,
        'is_filler' => false,
        'bubble_shop_spend' => 0,
        'guild_status' => 'pending',
        'faction' => 'none',
        'notes' => 'Added by admin.',
    ];

    $this->actingAs($admin)
        ->post(route('admin.character-approvals.characters.store', $user), $payload)
        ->assertRedirect();

    $character = Character::query()->where('user_id', $user->id)->first();

    expect($character)->not->toBeNull();
    expect($character->admin_managed)->toBeTrue();
    expect($character->guild_status)->toBe('pending');
    expect($character->characterClasses->pluck('id')->all())->toBe([$class->id]);
});

it('allows admins to update characters and marks them as admin managed', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'guild_status' => 'pending',
        'admin_managed' => false,
    ]);
    $character->characterClasses()->sync([CharacterClass::factory()->create()->id]);

    $newClass = CharacterClass::factory()->create();
    $payload = [
        'name' => 'Updated by admin',
        'class' => [$newClass->id],
        'external_link' => 'https://www.dndbeyond.com/characters/2222222',
        'start_tier' => 'lt',
        'version' => '2024',
        'dm_bubbles' => 3,
        'dm_coins' => 2,
        'is_filler' => false,
        'bubble_shop_spend' => 1,
        'guild_status' => 'pending',
        'faction' => 'none',
        'notes' => 'Updated by admin.',
    ];

    $this->actingAs($admin)
        ->patch(route('admin.character-approvals.characters.update', $character), $payload)
        ->assertRedirect();

    $character->refresh();

    expect($character->admin_managed)->toBeTrue();
    expect($character->name)->toBe('Updated by admin');
    expect($character->characterClasses->pluck('id')->all())->toBe([$newClass->id]);
});

it('allows admins to set quick levels for characters', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create([
        'admin_managed' => false,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);
    app(CharacterAuditTrail::class)->record($character, 'test.snapshot', metadata: ['hidden_from_history' => true]);

    $this->actingAs($admin)
        ->post(route('admin.character-approvals.characters.quick-level', $character), [
            'level' => 2,
        ])
        ->assertRedirect();

    $character->refresh();

    expect($character->admin_managed)->toBeTrue();
    expect($character->auditEvents()->where('action', 'level.set')->exists())->toBeTrue();
});
