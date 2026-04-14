<?php

use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Support\LevelProgression;

beforeEach(function () {
    LevelProgression::clearCache();
});

afterEach(function () {
    LevelProgression::clearCache();
});

it('uses the seeded default progression thresholds', function () {
    expect(LevelProgression::bubblesRequiredForNextLevel(1))->toBe(1)
        ->and(LevelProgression::bubblesRequiredForNextLevel(9))->toBe(9)
        ->and(LevelProgression::bubblesRequiredForNextLevel(10))->toBe(10)
        ->and(LevelProgression::bubblesRequiredForNextLevel(11))->toBe(11)
        ->and(LevelProgression::bubblesRequiredForNextLevel(12))->toBe(12);
});

it('calculates level thresholds from the seeded default progression', function () {
    expect(LevelProgression::bubblesRequiredForLevel(10))->toBe(45)
        ->and(LevelProgression::bubblesRequiredForLevel(11))->toBe(55)
        ->and(LevelProgression::bubblesRequiredForLevel(12))->toBe(66)
        ->and(LevelProgression::levelFromAvailableBubbles(54))->toBe(10)
        ->and(LevelProgression::levelFromAvailableBubbles(55))->toBe(11)
        ->and(LevelProgression::levelFromAvailableBubbles(189))->toBe(19)
        ->and(LevelProgression::levelFromAvailableBubbles(190))->toBe(20);
});

it('clears cached active totals after the progression version changes', function () {
    $activeVersion = LevelProgressionVersion::query()->where('is_active', true)->latest('id')->firstOrFail();

    expect(LevelProgression::bubblesRequiredForLevel(2))->toBe(1);

    LevelProgressionVersion::query()->whereKey($activeVersion->id)->update(['is_active' => false]);

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level === 1 ? 0 : 100 + $level,
        ]);
    }

    expect(LevelProgression::bubblesRequiredForLevel(2))->toBe(1);

    LevelProgression::clearCache();

    expect(LevelProgression::bubblesRequiredForLevel(2))->toBe(102)
        ->and(LevelProgression::activeVersionId())->toBe($newVersion->id);
});
