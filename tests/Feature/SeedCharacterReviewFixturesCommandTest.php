<?php

use App\Models\Character;
use App\Models\User;
use App\Support\CharacterActivityRule;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires force before replacing a users current characters', function () {
    $user = User::factory()->create();
    Character::factory()->for($user)->create([
        'guild_status' => 'approved',
    ]);

    $this->artisan(sprintf('characters:seed-review-fixtures %s', $user->email))
        ->expectsOutput('This command replaces the user\'s current visible characters. Re-run with --force.')
        ->assertExitCode(1);

    expect($user->characters()->whereNull('deleted_at')->count())->toBe(1);
});

it('soft deletes current characters and seeds a deterministic review fixture set', function () {
    $user = User::factory()->create([
        'simplified_tracking' => true,
        'avatar_masked' => false,
    ]);
    $existingCharacter = Character::factory()->for($user)->create([
        'guild_status' => 'approved',
        'name' => 'Existing Character',
    ]);

    $this->artisan(sprintf('characters:seed-review-fixtures %s --force', $user->email))
        ->expectsOutput(sprintf(
            'Soft-deleted 1 current character for %s and seeded 18 review fixture characters.',
            $user->email,
        ))
        ->assertSuccessful();

    expect(Character::withTrashed()->find($existingCharacter->id))->not->toBeNull()
        ->and(Character::withTrashed()->find($existingCharacter->id)?->trashed())->toBeTrue();

    $visibleCharacters = $user->characters()->whereNull('deleted_at')->orderBy('position')->get();

    expect($visibleCharacters)->toHaveCount(18)
        ->and($visibleCharacters->pluck('name')->all())->toContain(
            'Fixture 13 - Draft Blocked by Standard Slots',
            'Fixture 14 - Draft Blocked by Filler Slot',
            'Fixture 15 - Draft ET Allowed',
            'Fixture 16 - Needs Changes ET Allowed',
            'Fixture 17 - Declined Example',
            'Fixture 18 - Retired Example',
        )
        ->and($visibleCharacters->where('guild_status', 'pending'))->toHaveCount(3)
        ->and($visibleCharacters->where('guild_status', 'draft'))->toHaveCount(3)
        ->and($visibleCharacters->where('guild_status', 'needs_changes'))->toHaveCount(1)
        ->and($visibleCharacters->where('guild_status', 'declined'))->toHaveCount(1)
        ->and($visibleCharacters->where('guild_status', 'retired'))->toHaveCount(1)
        ->and($visibleCharacters->every(fn (Character $character): bool => $character->characterClasses->isNotEmpty()))->toBeTrue()
        ->and($visibleCharacters->every(fn (Character $character): bool => $character->simplified_tracking === true))->toBeTrue()
        ->and($visibleCharacters->every(fn (Character $character): bool => $character->avatar_masked === false))->toBeTrue();

    $activityRule = app(CharacterActivityRule::class);

    expect($activityRule->activeCharacterCountForUser($user))->toBe(8)
        ->and($activityRule->submittedFillerCountForUser($user))->toBe(1);

    expect(
        $visibleCharacters->firstWhere('name', 'Fixture 16 - Needs Changes ET Allowed')?->review_note
    )->toBe('Please update the linked details before resubmitting.');
});

it('reuses existing real class names instead of creating fixture-prefixed classes', function () {
    $user = User::factory()->create();

    \App\Models\CharacterClass::factory()->create([
        'name' => 'Fighter',
    ]);

    $this->artisan(sprintf('characters:seed-review-fixtures %s --force', $user->email))
        ->assertSuccessful();

    expect(\App\Models\CharacterClass::query()->where('name', 'Fighter')->count())->toBe(1)
        ->and(\App\Models\CharacterClass::query()->where('name', 'Fixture Fighter')->exists())->toBeFalse();
});
