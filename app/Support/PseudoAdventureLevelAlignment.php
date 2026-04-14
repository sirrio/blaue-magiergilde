<?php

namespace App\Support;

use App\Models\Adventure;
use App\Models\Character;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;

class PseudoAdventureLevelAlignment
{
    public function __construct(private CharacterProgressionState $progressionState = new CharacterProgressionState) {}

    /**
     * Backfill pseudo-adventures that were created before the target_level
     * column existed.  Their target_level is inferred from the cumulative
     * adventure bubbles at that point.
     *
     * @return array{pseudo_adventures_backfilled: int, characters_affected: int}
     */
    public function backfillMissingMetadata(int $versionId): array
    {
        $pseudoAdventuresBackfilled = 0;
        $charactersAffected = 0;

        Character::query()
            ->without(['allies.linkedCharacter', 'downtimes', 'characterClasses'])
            ->whereHas('adventures', function ($query): void {
                $query
                    ->whereNull('deleted_at')
                    ->where('is_pseudo', true)
                    ->where(function ($pseudoQuery): void {
                        $pseudoQuery
                            ->whereNull('target_level')
                            ->orWhereNull('progression_version_id');
                    });
            })
            ->with([
                'adventures' => fn ($query) => $query
                    ->whereNull('deleted_at')
                    ->orderBy('start_date')
                    ->orderBy('id'),
            ])
            ->chunkById(50, function (EloquentCollection $characters) use ($versionId, &$pseudoAdventuresBackfilled, &$charactersAffected): void {
                foreach ($characters as $character) {
                    $result = $this->backfillCharacter($character, $versionId);

                    if ($result['pseudo_adventures_backfilled'] > 0) {
                        $charactersAffected++;
                        $pseudoAdventuresBackfilled += $result['pseudo_adventures_backfilled'];
                    }
                }
            });

        return [
            'pseudo_adventures_backfilled' => $pseudoAdventuresBackfilled,
            'characters_affected' => $charactersAffected,
        ];
    }

    /**
     * Update the progression_version_id on all pseudo-adventures to the new
     * version.  Since target_level is the source of truth (not duration),
     * no bubble recalculation is needed when the curve changes.
     *
     * @return array{pseudo_adventures_realigned: int, characters_affected: int}
     */
    public function realignAllToVersion(int $versionId): array
    {
        $affected = Adventure::query()
            ->whereNull('deleted_at')
            ->where('is_pseudo', true)
            ->where(function ($q) use ($versionId): void {
                $q->where('progression_version_id', '!=', $versionId)
                    ->orWhereNull('progression_version_id');
            })
            ->update([
                'progression_version_id' => $versionId,
                'duration' => 0,
                'has_additional_bubble' => false,
            ]);

        $charactersAffected = $affected > 0
            ? Adventure::query()
                ->whereNull('deleted_at')
                ->where('is_pseudo', true)
                ->where('progression_version_id', $versionId)
                ->distinct()
                ->count('character_id')
            : 0;

        return [
            'pseudo_adventures_realigned' => $affected,
            'characters_affected' => $charactersAffected,
        ];
    }

    /**
     * @return array{pseudo_adventures_backfilled: int}
     */
    private function backfillCharacter(Character $character, int $versionId): array
    {
        $runningRealBubbles = 0;
        $dmBubbles = $this->progressionState->dmBubblesForProgression($character);
        $bubbleSpend = $this->progressionState->bubbleShopSpendForProgression($character);
        $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
        $backfilledCount = 0;

        foreach ($character->adventures as $adventure) {
            if (! $adventure->is_pseudo) {
                $runningRealBubbles += $this->bubblesForAdventure(
                    $this->safeInt($adventure->duration),
                    (bool) $adventure->has_additional_bubble,
                );

                continue;
            }

            // Legacy pseudo — infer target_level from the duration-based bubbles.
            $pseudoBubbles = $this->bubblesForAdventure(
                $this->safeInt($adventure->duration),
                (bool) $adventure->has_additional_bubble,
            );
            $availableBubbles = max(
                0,
                $runningRealBubbles + $pseudoBubbles + $dmBubbles + $additionalBubbles - $bubbleSpend,
            );
            $targetLevel = LevelProgression::levelFromAvailableBubbles($availableBubbles, $versionId);

            $adventure->forceFill([
                'target_level' => $targetLevel,
                'progression_version_id' => $versionId,
                'duration' => 0,
                'has_additional_bubble' => false,
            ])->save();

            // Reset running total — the pseudo overrides the level at this point.
            $runningRealBubbles = 0;
            $backfilledCount++;
        }

        return ['pseudo_adventures_backfilled' => $backfilledCount];
    }

    private function bubblesForAdventure(int $duration, bool $hasAdditionalBubble): int
    {
        return (int) floor($duration / 10800) + ($hasAdditionalBubble ? 1 : 0);
    }

    private function additionalBubblesForStartTier(?string $startTier): int
    {
        return match (strtolower((string) $startTier)) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
    }

    private function safeInt(mixed $value, int $fallback = 0): int
    {
        $number = filter_var($value, FILTER_VALIDATE_INT);

        return $number !== false ? (int) $number : $fallback;
    }
}
