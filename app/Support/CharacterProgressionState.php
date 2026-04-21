<?php

namespace App\Support;

use App\Models\Adventure;
use App\Models\Character;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CharacterProgressionState
{
    public function usesManualLevelTracking(Character $character): bool
    {
        return $this->hasPseudoAdventures($character);
    }

    public function countsBubbleAdjustments(Character $character): bool
    {
        return ! $this->usesManualLevelTracking($character);
    }

    public function dmBubblesForProgression(Character $character): int
    {
        if (! $this->countsBubbleAdjustments($character)) {
            return 0;
        }

        return $this->safeInt($character->dm_bubbles);
    }

    public function bubbleShopSpendForProgression(Character $character): int
    {
        if (! $this->countsBubbleAdjustments($character)) {
            return 0;
        }

        return $this->safeInt($character->bubble_shop_spend);
    }

    public function hasPseudoAdventures(Character $character): bool
    {
        return $this->adventures($character)
            ->contains(fn (Adventure $adventure): bool => ! $adventure->trashed() && (bool) $adventure->is_pseudo);
    }

    public function progressionVersionId(Character $character): int
    {
        return LevelProgression::versionIdForCharacter($character);
    }

    public function availableBubbles(Character $character): int
    {
        if ($character->is_filler) {
            return 0;
        }

        $latestPseudo = $this->latestPseudoAdventure($character);

        if (! $latestPseudo) {
            return max(
                0,
                $this->baseAdventureTrackedBubbles($character) - $this->bubbleShopSpendForProgression($character),
            );
        }

        $pseudoBubbles = $latestPseudo->target_bubbles !== null
            ? $this->safeInt($latestPseudo->target_bubbles)
            : LevelProgression::bubblesRequiredForLevel(
                $this->safeInt($latestPseudo->target_level, 1),
                $latestPseudo->progression_version_id,
            );

        return max(0, $pseudoBubbles + $this->realAdventureBubblesAfterPseudo($character, $latestPseudo));
    }

    public function currentLevel(Character $character): int
    {
        if ($character->is_filler) {
            return 3;
        }

        return LevelProgression::levelFromAvailableBubbles(
            $this->availableBubbles($character),
            $this->progressionVersionId($character),
        );
    }

    public function bubblesInCurrentLevel(Character $character): int
    {
        $level = $this->currentLevel($character);

        return max(
            0,
            $this->availableBubbles($character) - LevelProgression::bubblesRequiredForLevel($level, $this->progressionVersionId($character)),
        );
    }

    /**
     * @return Collection<int, Adventure>
     */
    private function adventures(Character $character): Collection
    {
        if ($character->relationLoaded('adventures')) {
            return $character->adventures;
        }

        return $character->adventures()->get();
    }

    private function baseAdventureTrackedBubbles(Character $character): int
    {
        return max(
            0,
            $this->allRealAdventureBubbles($character)
            + $this->dmBubblesForProgression($character)
            + $this->additionalBubblesForStartTier($character->start_tier),
        );
    }

    private function allRealAdventureBubbles(Character $character): int
    {
        if ($character->relationLoaded('adventures')) {
            return max(
                0,
                $this->adventures($character)
                    ->filter(fn (Adventure $adventure): bool => ! $adventure->is_pseudo && ! $adventure->trashed())
                    ->sum(fn (Adventure $adventure): int => $this->realAdventureBubbles($adventure)),
            );
        }

        return max(
            0,
            $this->safeInt(
                $character->adventures()
                    ->whereNull('deleted_at')
                    ->where('is_pseudo', false)
                    ->selectRaw('COALESCE(SUM('.$this->durationBubbleSql().' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles')
                    ->value('bubbles')
            ),
        );
    }

    private function latestPseudoAdventure(Character $character): ?Adventure
    {
        if ($character->relationLoaded('adventures')) {
            return $this->adventures($character)
                ->filter(fn (Adventure $adventure): bool => ! $adventure->trashed() && (bool) $adventure->is_pseudo)
                ->sortBy([
                    ['start_date', 'desc'],
                    ['id', 'desc'],
                ])
                ->first();
        }

        return $character->adventures()
            ->whereNull('deleted_at')
            ->where('is_pseudo', true)
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->first();
    }

    private function realAdventureBubblesAfterPseudo(Character $character, Adventure $latestPseudo): int
    {
        if ($character->relationLoaded('adventures')) {
            return max(
                0,
                $this->adventures($character)
                    ->filter(function (Adventure $adventure) use ($latestPseudo): bool {
                        if ($adventure->trashed() || $adventure->is_pseudo) {
                            return false;
                        }

                        if ((string) $adventure->start_date > (string) $latestPseudo->start_date) {
                            return true;
                        }

                        return (string) $adventure->start_date === (string) $latestPseudo->start_date
                            && $adventure->id > $latestPseudo->id;
                    })
                    ->sum(fn (Adventure $adventure): int => $this->realAdventureBubbles($adventure)),
            );
        }

        return max(
            0,
            $this->safeInt(
                $character->adventures()
                    ->whereNull('deleted_at')
                    ->where('is_pseudo', false)
                    ->where(function ($query) use ($latestPseudo): void {
                        $query->where('start_date', '>', $latestPseudo->start_date)
                            ->orWhere(function ($nestedQuery) use ($latestPseudo): void {
                                $nestedQuery->where('start_date', $latestPseudo->start_date)
                                    ->where('id', '>', $latestPseudo->id);
                            });
                    })
                    ->selectRaw('COALESCE(SUM('.$this->durationBubbleSql().' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles')
                    ->value('bubbles')
            ),
        );
    }

    private function realAdventureBubbles(Adventure $adventure): int
    {
        return intdiv($this->safeInt($adventure->duration), 10800)
            + ((bool) $adventure->has_additional_bubble ? 1 : 0);
    }

    private function additionalBubblesForStartTier(?string $startTier): int
    {
        return match (strtolower((string) $startTier)) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
    }

    private function durationBubbleSql(): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => 'CAST(duration / 10800 AS INTEGER)',
            'mysql', 'mariadb' => 'FLOOR(duration / 10800)',
            default => 'FLOOR(duration / 10800)',
        };
    }

    private function safeInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
