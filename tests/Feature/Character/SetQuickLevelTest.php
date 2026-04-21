<?php

use App\Actions\Character\SetQuickLevel;
use App\Models\Adventure;
use App\Models\Character;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Support\LevelProgression;

beforeEach(function () {
    LevelProgression::clearCache();
});

afterEach(function () {
    LevelProgression::clearCache();
});

it('updates the latest pseudo adventure when it is the most recent adventure', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
    ]);

    $pseudo = Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'start_date' => now()->toDateString(),
        'has_additional_bubble' => false,
        'is_pseudo' => true,
    ]);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    expect($result['ok'])->toBeTrue();
    expect(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(1);
    expect($pseudo->fresh()->duration)->toBe(0);
    expect($pseudo->fresh()->target_level)->toBe(4);
    expect($pseudo->fresh()->progression_version_id)->toBe(LevelProgression::activeVersionId());
});

it('creates a new pseudo adventure when a real adventure follows the latest pseudo', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'start_date' => now()->subDays(2)->toDateString(),
        'has_additional_bubble' => false,
        'is_pseudo' => true,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'start_date' => now()->subDay()->toDateString(),
        'has_additional_bubble' => false,
        'is_pseudo' => false,
    ]);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    expect($result['ok'])->toBeTrue();
    expect(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(2);
    expect(
        Adventure::query()
            ->where('character_id', $character->id)
            ->where('is_pseudo', true)
            ->orderByDesc('id')
            ->first()?->target_level
    )->toBe(4);
});

it('ignores dm bubbles and bubble shop spend when setting levels in level tracking', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 5,
        'bubble_shop_spend' => 4,
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    expect($result['ok'])->toBeTrue();

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->first();

    expect($pseudo)->not->toBeNull()
        ->and($pseudo?->duration)->toBe(0)
        ->and($pseudo?->target_level)->toBe(4);
});

it('uses the character progression version instead of the active version', function () {
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

    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersionId,
    ]);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->first();

    expect($result['ok'])->toBeTrue()
        ->and($pseudo)->not->toBeNull()
        ->and($pseudo?->progression_version_id)->toBe($originalVersionId)
        ->and($pseudo?->target_bubbles)->toBe(LevelProgression::bubblesRequiredForLevel(4, $originalVersionId));
});
