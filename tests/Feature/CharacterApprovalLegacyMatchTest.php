<?php

use App\Models\Character;
use App\Models\LegacyCharacterApproval;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('includes legacy approval match data for matching characters', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    Character::factory()->for($user)->create([
        'name' => 'Liza',
        'external_link' => 'https://www.dndbeyond.com/characters/132337081',
    ]);

    LegacyCharacterApproval::factory()->create([
        'discord_name' => 'sirrio',
        'player_name' => 'David',
        'room' => '1.13',
        'tier' => 'bt',
        'character_name' => 'Liza',
        'external_link' => 'https://www.dndbeyond.com/characters/132337081',
        'dndbeyond_character_id' => 132337081,
        'source_row' => 3,
        'source_column' => 'bt',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.character-approvals.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('characters.0.has_legacy_approval', true)
            ->where('characters.0.legacy_approval_match.character_name', 'Liza')
            ->where('characters.0.legacy_approval_match.player_name', 'David')
            ->where('characters.0.legacy_approval_match.tier', 'bt'));
});

it('filters character approvals by legacy match status', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    Character::factory()->for($user)->create([
        'name' => 'Matched',
        'external_link' => 'https://www.dndbeyond.com/characters/132337081',
    ]);

    Character::factory()->for($user)->create([
        'name' => 'Missing',
        'external_link' => 'https://www.dndbeyond.com/characters/132337099',
    ]);

    LegacyCharacterApproval::factory()->create([
        'character_name' => 'Matched',
        'external_link' => 'https://www.dndbeyond.com/characters/132337081',
        'dndbeyond_character_id' => 132337081,
        'tier' => 'lt',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.character-approvals.index', ['legacy' => 'matched']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('characters', 1)
            ->where('characters.0.name', 'Matched'));

    $this->actingAs($admin)
        ->get(route('admin.character-approvals.index', ['legacy' => 'missing']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('characters', 1)
            ->where('characters.0.name', 'Missing')
            ->where('characters.0.has_legacy_approval', false));
});
