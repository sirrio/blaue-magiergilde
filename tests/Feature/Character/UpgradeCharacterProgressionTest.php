<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Models\User;
use App\Support\LevelProgression;

beforeEach(function () {
    LevelProgression::clearCache();
});

afterEach(function () {
    LevelProgression::clearCache();
});

it('upgrades a character to the active progression version and stores the chosen target level', function () {
    $user = User::factory()->create();
    $originalVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($originalVersionId)->update(['is_active' => false]);

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersionId,
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 6,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->first();

    expect($character->fresh()->progression_version_id)->toBe($newVersion->id)
        ->and($pseudo)->not->toBeNull()
        ->and($pseudo?->target_level)->toBe(6)
        ->and($pseudo?->progression_version_id)->toBe($newVersion->id);
});

it('rolls back the version change when the chosen target level is below the new minimum', function () {
    $user = User::factory()->create();
    $originalVersionId = LevelProgression::activeVersionId();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersionId,
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 5 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersionId)->update(['is_active' => false]);

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level === 1 ? 0 : $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 2,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersionId)
        ->and(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(0);
});

it('upgrades an adventure-tracked character without creating a pseudo adventure and uses bubble shop spend to lower the new level', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => ($level - 1) * 5,
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => false,
        'progression_version_id' => $originalVersion->id,
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 5 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 4,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_spend)->toBe(2)
        ->and(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(5 - $character->bubble_shop_spend, $newVersion->id))->toBe(4);
});

it('supports selecting bubbles within the target level during an adventure-tracking upgrade', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => ($level - 1) * 5,
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => (int) (($level - 1) * $level / 2),
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => false,
        'progression_version_id' => $originalVersion->id,
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 4,
        'bubbles_in_level' => 2,
    ])->assertRedirect();

    $character->refresh();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_spend)->toBe(2)
        ->and(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(10 - $character->bubble_shop_spend, $newVersion->id))->toBe(4)
        ->and((10 - $character->bubble_shop_spend) - LevelProgression::bubblesRequiredForLevel(4, $newVersion->id))->toBe(2);
});

it('does not allow an adventure-tracked character to switch below the current displayed level on the new curve', function () {
    $user = User::factory()->create();
    $originalVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($originalVersionId)->update(['is_active' => false]);

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => false,
        'progression_version_id' => $originalVersionId,
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 65 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 13,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersionId)
        ->and($character->fresh()->bubble_shop_spend)->toBe(0);
});

it('does not allow a pseudo-tracked character to switch above the recalculated level on the new curve', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => ($level - 1) * 5,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersion->id,
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::forceCreate([
        'character_id' => $character->id,
        'title' => 'Pseudo level',
        'duration' => 0,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 5,
        'target_bubbles' => 4,
        'progression_version_id' => $originalVersion->id,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 5,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersion->id);
});
