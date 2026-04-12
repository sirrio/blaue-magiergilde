<?php

namespace App\Support;

use App\Models\Character;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;

class PseudoAdventureLevelAlignment
{
    /**
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
     * @return array{pseudo_adventures_realigned: int, characters_affected: int}
     */
    public function realignAllToVersion(int $versionId): array
    {
        $pseudoAdventuresRealigned = 0;
        $charactersAffected = 0;

        Character::query()
            ->without(['allies.linkedCharacter', 'downtimes', 'characterClasses'])
            ->whereHas('adventures', fn ($query) => $query->whereNull('deleted_at')->where('is_pseudo', true))
            ->with([
                'adventures' => fn ($query) => $query
                    ->whereNull('deleted_at')
                    ->orderBy('start_date')
                    ->orderBy('id'),
            ])
            ->chunkById(50, function (EloquentCollection $characters) use ($versionId, &$pseudoAdventuresRealigned, &$charactersAffected): void {
                foreach ($characters as $character) {
                    $result = $this->realignCharacter($character, $versionId);

                    if ($result['pseudo_adventures_realigned'] > 0) {
                        $charactersAffected++;
                        $pseudoAdventuresRealigned += $result['pseudo_adventures_realigned'];
                    }
                }
            });

        return [
            'pseudo_adventures_realigned' => $pseudoAdventuresRealigned,
            'characters_affected' => $charactersAffected,
        ];
    }

    /**
     * @return array{pseudo_adventures_backfilled: int}
     */
    private function backfillCharacter(Character $character, int $versionId): array
    {
        $runningAdventureBubbles = 0;
        $dmBubbles = $this->safeInt($character->dm_bubbles);
        $bubbleSpend = $this->safeInt($character->bubble_shop_spend);
        $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
        $backfilledCount = 0;

        foreach ($character->adventures as $adventure) {
            $runningAdventureBubbles += $this->bubblesForAdventure(
                $this->safeInt($adventure->duration),
                (bool) $adventure->has_additional_bubble,
            );

            if (! $adventure->is_pseudo) {
                continue;
            }

            $availableBubbles = max(
                0,
                $runningAdventureBubbles + $dmBubbles + $additionalBubbles - $bubbleSpend,
            );

            $adventure->forceFill([
                'target_level' => LevelProgression::levelFromAvailableBubbles($availableBubbles, $versionId),
                'progression_version_id' => $versionId,
            ])->save();

            $backfilledCount++;
        }

        return ['pseudo_adventures_backfilled' => $backfilledCount];
    }

    /**
     * @return array{pseudo_adventures_realigned: int}
     */
    private function realignCharacter(Character $character, int $versionId): array
    {
        $runningAdventureBubbles = 0;
        $dmBubbles = $this->safeInt($character->dm_bubbles);
        $bubbleSpend = $this->safeInt($character->bubble_shop_spend);
        $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
        $realignedCount = 0;

        foreach ($character->adventures as $adventure) {
            if (! $adventure->is_pseudo) {
                $runningAdventureBubbles += $this->bubblesForAdventure(
                    $this->safeInt($adventure->duration),
                    (bool) $adventure->has_additional_bubble,
                );

                continue;
            }

            $targetLevel = max(
                1,
                min(
                    20,
                    $this->safeInt(
                        $adventure->target_level,
                        LevelProgression::levelFromAvailableBubbles(
                            max(0, $runningAdventureBubbles + $dmBubbles + $additionalBubbles - $bubbleSpend),
                            $adventure->progression_version_id ?: $versionId,
                        ),
                    ),
                ),
            );
            $requiredAdventureBubbles = max(
                0,
                LevelProgression::bubblesRequiredForLevel($targetLevel, $versionId)
                    - $dmBubbles
                    - $additionalBubbles
                    + $bubbleSpend,
            );
            $desiredPseudoBubbles = max(0, $requiredAdventureBubbles - $runningAdventureBubbles);

            $adventure->forceFill([
                'duration' => $desiredPseudoBubbles * 10800,
                'has_additional_bubble' => false,
                'target_level' => $targetLevel,
                'progression_version_id' => $versionId,
            ])->save();

            $runningAdventureBubbles += $desiredPseudoBubbles;
            $realignedCount++;
        }

        return ['pseudo_adventures_realigned' => $realignedCount];
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
