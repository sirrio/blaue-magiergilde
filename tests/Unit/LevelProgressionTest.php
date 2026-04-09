<?php

use App\Support\LevelProgression;

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
