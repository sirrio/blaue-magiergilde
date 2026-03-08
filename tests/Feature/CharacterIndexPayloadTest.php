<?php

use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('does not include unused games prop on characters index', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->get(route('characters.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];

    expect($props)->not->toHaveKey('games');
});

it('returns a slimmed guild character payload on characters index', function () {
    $user = User::factory()->create();
    Character::factory()->for($user)->create(['guild_status' => 'draft']);
    $guildCharacter = Character::factory()->create(['guild_status' => 'approved']);

    $response = $this->actingAs($user)
        ->get(route('characters.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $guildCharacters = $props['guildCharacters'] ?? [];
    $entry = collect($guildCharacters)->first(fn (array $item): bool => (int) ($item['id'] ?? 0) === $guildCharacter->id);

    expect($entry)->toBeArray();
    expect($entry)->not->toHaveKey('allies');
    expect($entry)->not->toHaveKey('downtimes');
    expect($entry)->not->toHaveKey('character_classes');
    expect($entry)->not->toHaveKey('faction_rank');
});

it('includes reviewed by name for reviewed characters on characters index', function () {
    $owner = User::factory()->create();
    $reviewer = User::factory()->create([
        'name' => 'Review Admin',
    ]);

    $character = Character::factory()
        ->for($owner)
        ->create([
            'guild_status' => 'approved',
        ]);

    AdminAuditLog::query()->create([
        'actor_user_id' => $reviewer->id,
        'action' => 'character.guild_status.updated',
        'subject_type' => Character::class,
        'subject_id' => $character->id,
        'metadata' => [
            'from' => 'pending',
            'to' => 'approved',
        ],
    ]);

    $response = $this->actingAs($owner)
        ->get(route('characters.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $characters = $props['characters'] ?? [];
    $entry = collect($characters)->first(fn (array $item): bool => (int) ($item['id'] ?? 0) === $character->id);

    expect($entry)->toBeArray();
    expect($entry['reviewed_by_name'] ?? null)->toBe('Review Admin');
});
