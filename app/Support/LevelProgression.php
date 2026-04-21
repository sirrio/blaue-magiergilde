<?php

namespace App\Support;

use App\Models\Character;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use RuntimeException;

class LevelProgression
{
    /**
     * @var array<int, array<int, int>>
     */
    private static array $totalsByVersion = [];

    private static ?int $cachedActiveVersionId = null;

    /**
     * @return array<int, array<int, int>>
     */
    public static function allTotalsByVersion(): array
    {
        $versionIds = LevelProgressionVersion::query()
            ->orderBy('id')
            ->pluck('id')
            ->map(fn (mixed $id): int => (int) $id)
            ->all();

        $totals = [];

        foreach ($versionIds as $versionId) {
            $totals[$versionId] = self::totals($versionId);
        }

        return $totals;
    }

    /**
     * @return array<int, int>
     */
    public static function totals(?int $versionId = null): array
    {
        $resolvedVersionId = $versionId ?? self::activeVersionId();

        if (array_key_exists($resolvedVersionId, self::$totalsByVersion)) {
            return self::$totalsByVersion[$resolvedVersionId];
        }

        $totals = LevelProgressionEntry::query()
            ->where('version_id', $resolvedVersionId)
            ->orderBy('level')
            ->pluck('required_bubbles', 'level')
            ->mapWithKeys(fn (mixed $requiredBubbles, mixed $level) => [(int) $level => (int) $requiredBubbles])
            ->toArray();

        if (count($totals) !== 20) {
            throw new RuntimeException("The level progression table must contain exactly 20 levels for version {$resolvedVersionId}.");
        }

        self::$totalsByVersion[$resolvedVersionId] = $totals;

        return $totals;
    }

    public static function activeVersionId(): int
    {
        if (self::$cachedActiveVersionId !== null) {
            return self::$cachedActiveVersionId;
        }

        $activeVersionId = LevelProgressionVersion::query()
            ->where('is_active', true)
            ->orderByDesc('id')
            ->value('id');

        if (! $activeVersionId) {
            throw new RuntimeException('An active level progression version is required.');
        }

        self::$cachedActiveVersionId = (int) $activeVersionId;

        return self::$cachedActiveVersionId;
    }

    public static function clearCache(): void
    {
        self::$totalsByVersion = [];
        self::$cachedActiveVersionId = null;
    }

    public static function versionIdForCharacter(?Character $character): int
    {
        $resolvedVersionId = $character?->progression_version_id;

        return is_numeric($resolvedVersionId) && (int) $resolvedVersionId > 0
            ? (int) $resolvedVersionId
            : self::activeVersionId();
    }

    public static function bubblesRequiredForLevel(int $level, ?int $versionId = null): int
    {
        $normalizedLevel = min(20, max(1, $level));
        $totals = self::totals($versionId);

        return $totals[$normalizedLevel];
    }

    public static function bubblesRequiredForNextLevel(int $level, ?int $versionId = null): int
    {
        $normalizedLevel = min(20, max(1, $level));
        if ($normalizedLevel >= 20) {
            return 0;
        }

        return self::bubblesRequiredForLevel($normalizedLevel + 1, $versionId) - self::bubblesRequiredForLevel($normalizedLevel, $versionId);
    }

    public static function levelFromAvailableBubbles(int $availableBubbles, ?int $versionId = null): int
    {
        $remainingBubbles = max(0, $availableBubbles);
        $level = 1;

        while ($level < 20) {
            $requiredForNextLevel = self::bubblesRequiredForNextLevel($level, $versionId);

            if ($remainingBubbles < $requiredForNextLevel) {
                break;
            }

            $remainingBubbles -= $requiredForNextLevel;
            $level++;
        }

        return $level;
    }
}
