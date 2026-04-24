<?php

use App\Models\AdminAuditLog;
use App\Models\Adventure;
use App\Models\Ally;
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
    recordCharacterSnapshot(Character::factory()->for($user)->create(['guild_status' => 'draft']));
    $guildCharacter = recordCharacterSnapshot(Character::factory()->create(['guild_status' => 'approved']));

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
    recordCharacterSnapshot($character);

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

it('hides private linked character avatars from other users in characters index payload', function () {
    $viewer = User::factory()->create();
    $privateOwner = User::factory()->create();
    $viewerCharacter = Character::factory()->for($viewer)->create();
    $privateCharacter = Character::factory()->for($privateOwner)->create([
        'private_mode' => true,
        'avatar' => 'avatars/private.png',
        'guild_status' => 'approved',
    ]);
    $publicCharacter = Character::factory()->for($privateOwner)->create([
        'private_mode' => false,
        'avatar' => 'avatars/public.png',
        'guild_status' => 'approved',
    ]);
    collect([$viewerCharacter, $privateCharacter, $publicCharacter])
        ->each(fn (Character $character): Character => recordCharacterSnapshot($character));

    Ally::factory()->create([
        'character_id' => $viewerCharacter->id,
        'name' => $privateCharacter->name,
        'rating' => 3,
        'linked_character_id' => $privateCharacter->id,
    ]);

    $response = $this->actingAs($viewer)
        ->get(route('characters.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $characters = collect($props['characters'] ?? []);
    $viewerEntry = $characters->first(fn (array $item): bool => (int) ($item['id'] ?? 0) === $viewerCharacter->id);
    $linkedCharacter = collect($viewerEntry['allies'] ?? [])->first()['linked_character'] ?? null;
    $guildCharacters = collect($props['guildCharacters'] ?? []);
    $privateGuildEntry = $guildCharacters->first(fn (array $item): bool => (int) ($item['id'] ?? 0) === $privateCharacter->id);
    $publicGuildEntry = $guildCharacters->first(fn (array $item): bool => (int) ($item['id'] ?? 0) === $publicCharacter->id);

    expect($linkedCharacter['avatar'] ?? null)->toBe('');
    expect($privateGuildEntry['avatar'] ?? null)->toBe('');
    expect($publicGuildEntry['avatar'] ?? null)->toBe('avatars/public.png');
    expect($privateGuildEntry['user']['name'] ?? null)->toBe($privateOwner->name);
    expect($privateGuildEntry)->not->toHaveKey('private_mode');
    expect($privateGuildEntry)->not->toHaveKey('user_id');
});

it('includes adventure ally ids on characters index payload', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create();
    $ally = Ally::factory()->create([
        'character_id' => $character->id,
        'name' => 'Shared Ally',
        'rating' => 3,
    ]);
    $adventure = Adventure::factory()->for($character)->create();
    $adventure->allies()->sync([$ally->id]);
    recordCharacterSnapshot($character);

    $response = $this->actingAs($user)
        ->get(route('characters.index'))
        ->assertOk();

    $props = $response->viewData('page')['props'] ?? [];
    $entry = collect($props['characters'] ?? [])->first(fn (array $item): bool => (int) ($item['id'] ?? 0) === $character->id);

    expect($entry)->toBeArray();
    expect($entry['adventures'][0]['allies'][0]['id'] ?? null)->toBe($ally->id);
});
