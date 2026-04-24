<?php

namespace App\Support;

use App\Models\Character;

class FactionRankCalculator
{
    private const RANK_THREE_DOWNTIME = 360000;

    private const RANK_FIVE_DOWNTIME = 1800000;

    public function __construct(private CharacterProgressionState $progressionState = new CharacterProgressionState) {}

    public function calculate(Character $character, ?array $pendingEvent = null): int
    {
        if ($character->manual_faction_rank !== null) {
            return max(0, min(5, (int) $character->manual_faction_rank));
        }

        $faction = (string) ($character->faction ?? 'none');
        $level = $this->calculateLevel($character, $pendingEvent);

        if ($level <= 4 || $faction === 'none') {
            return 0;
        }

        if ($this->adventureCount($character, $pendingEvent) < 10) {
            return 1;
        }

        $factionDowntime = $this->calculateFactionDowntimeSeconds($character, $pendingEvent);

        if ($level >= 18 && $factionDowntime >= self::RANK_FIVE_DOWNTIME) {
            return 5;
        }

        if ($level >= 14 && $factionDowntime >= self::RANK_THREE_DOWNTIME) {
            return 4;
        }

        if ($level >= 9 && $factionDowntime >= self::RANK_THREE_DOWNTIME) {
            return 3;
        }

        return 2;
    }

    private function calculateLevel(Character $character, ?array $pendingEvent = null): int
    {
        if ($character->is_filler) {
            return 3;
        }

        $pendingDelta = is_array($pendingEvent['delta'] ?? null) ? $pendingEvent['delta'] : [];
        $pendingOccurredAt = $pendingEvent['occurred_at'] ?? null;

        return $this->progressionState->currentLevel($character, $pendingDelta, $pendingOccurredAt);
    }

    private function adventureCount(Character $character, ?array $pendingEvent = null): int
    {
        return $this->progressionState->currentAdventureCount($character, $pendingEvent);
    }

    private function calculateFactionDowntimeSeconds(Character $character, ?array $pendingEvent = null): int
    {
        return $this->progressionState->currentDowntimeTotals($character, $pendingEvent)['faction'];
    }
}
