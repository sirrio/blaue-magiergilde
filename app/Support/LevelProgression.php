<?php

namespace App\Support;

use App\Models\LevelProgressionEntry;
use RuntimeException;

class LevelProgression
{
    /**
     * @var array<int, int>|null
     */
    private static ?array $cachedTotals = null;

    /**
     * @return array<int, int>
     */
    public static function totals(): array
    {
        if (self::$cachedTotals !== null) {
            return self::$cachedTotals;
        }

        $totals = LevelProgressionEntry::query()
            ->orderBy('level')
            ->pluck('required_bubbles', 'level')
            ->mapWithKeys(fn (mixed $requiredBubbles, mixed $level) => [(int) $level => (int) $requiredBubbles])
            ->toArray();

        if (count($totals) !== 20) {
            throw new RuntimeException('The level progression table must contain exactly 20 levels.');
        }

        return self::$cachedTotals = $totals;
    }

    public static function clearCache(): void
    {
        self::$cachedTotals = null;
    }

    public static function bubblesRequiredForLevel(int $level): int
    {
        $normalizedLevel = min(20, max(1, $level));
        $totals = self::totals();

        return $totals[$normalizedLevel];
    }

    public static function bubblesRequiredForNextLevel(int $level): int
    {
        $normalizedLevel = min(20, max(1, $level));
        if ($normalizedLevel >= 20) {
            return 0;
        }

        return self::bubblesRequiredForLevel($normalizedLevel + 1) - self::bubblesRequiredForLevel($normalizedLevel);
    }

    public static function levelFromAvailableBubbles(int $availableBubbles): int
    {
        $remainingBubbles = max(0, $availableBubbles);
        $level = 1;

        while ($level < 20) {
            $requiredForNextLevel = self::bubblesRequiredForNextLevel($level);

            if ($remainingBubbles < $requiredForNextLevel) {
                break;
            }

            $remainingBubbles -= $requiredForNextLevel;
            $level++;
        }

        return $level;
    }
}
