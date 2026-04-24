<?php

namespace App\Actions\Character;

use App\Models\Character;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterProgressionSnapshotResolver;
use App\Support\LevelProgression;
use Illuminate\Support\Facades\DB;

class SetQuickLevel
{
    public function __construct(
        private readonly CharacterAuditTrail $auditTrail = new CharacterAuditTrail,
        private readonly CharacterProgressionSnapshotResolver $progressionSnapshots = new CharacterProgressionSnapshotResolver,
    ) {}

    public function handle(Character $character, int $level, int $bubblesInLevel = 0, bool $forceAnchor = false): array
    {
        return DB::transaction(function () use ($character, $level, $bubblesInLevel, $forceAnchor): array {
            $progressionVersionId = LevelProgression::versionIdForCharacter($character);

            $snapshot = $this->progressionSnapshots->snapshot($character);
            $currentLevel = (int) $snapshot['level'];
            $currentAvailableBubbles = (int) $snapshot['available_bubbles'];
            $hasLevelAnchor = (bool) ($snapshot['has_level_anchor'] ?? false);
            $minAllowedLevel = $currentLevel;

            if (! $forceAnchor && ! $character->is_filler && $level < $minAllowedLevel) {
                return ['ok' => false, 'reason' => 'below_real', 'minLevel' => $minAllowedLevel];
            }

            $needsAnchor = $forceAnchor || $level > $currentLevel || $hasLevelAnchor;
            if (! $needsAnchor) {
                return ['ok' => true];
            }

            $levelFloor = LevelProgression::bubblesRequiredForLevel($level, $progressionVersionId);
            $nextLevelFloor = LevelProgression::bubblesRequiredForLevel(min(20, $level + 1), $progressionVersionId);
            $maxSelectableBubblesInLevel = max(0, ($nextLevelFloor - $levelFloor) - 1);
            $minBubblesInLevel = $forceAnchor
                ? 0
                : max(0, $currentAvailableBubbles - $levelFloor);
            $clampedBubblesInLevel = max($minBubblesInLevel, min($bubblesInLevel, $maxSelectableBubblesInLevel));
            $targetBubbles = $levelFloor + $clampedBubblesInLevel;

            $this->auditTrail->record($character, 'level.set', delta: [
                'available_bubbles' => $targetBubbles,
                'target_level' => $level,
                'bubbles_in_level' => $clampedBubblesInLevel,
            ], metadata: [
                'force_anchor' => $forceAnchor,
                'previous_level' => $currentLevel,
                'previous_available_bubbles' => $currentAvailableBubbles,
            ]);

            return ['ok' => true];
        });
    }
}
