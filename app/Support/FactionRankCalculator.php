<?php

namespace App\Support;

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use Illuminate\Support\Collection;

class FactionRankCalculator
{
    private const MIN_BUBBLE_DURATION = 10800;
    private const RANK_THREE_DOWNTIME = 360000;
    private const RANK_FIVE_DOWNTIME = 1800000;

    public function calculate(Character $character): int
    {
        $faction = (string) ($character->faction ?? 'none');
        $level = $this->calculateLevel($character);

        if ($level <= 4 || $faction === 'none') {
            return 0;
        }

        if ($this->adventureCount($character) < 10) {
            return 1;
        }

        $factionDowntime = $this->calculateFactionDowntimeSeconds($character);

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

    private function calculateLevel(Character $character): int
    {
        if ($character->is_filler) {
            return 3;
        }

        $bubbles = $this->calculateBubbles($character);
        $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
        $bubbleShopSpend = $this->safeInt($character->bubble_shop_spend);
        $availableBubbles = max(0, $bubbles + $additionalBubbles - $bubbleShopSpend);
        $level = (int) floor(1 + (sqrt(8 * $availableBubbles + 1) - 1) / 2);

        return min(20, max(1, $level));
    }

    private function calculateBubbles(Character $character): int
    {
        $dmBubbles = $this->safeInt($character->dm_bubbles);

        return $dmBubbles + $this->calculateAdventureBubbles($character);
    }

    private function calculateAdventureBubbles(Character $character): int
    {
        return $this->adventures($character)->reduce(function (int $bubble, Adventure $adventure): int {
            $duration = $this->safeInt($adventure->duration);
            $bonus = $adventure->has_additional_bubble ? 1 : 0;

            return $bubble + (int) floor($duration / self::MIN_BUBBLE_DURATION) + $bonus;
        }, 0);
    }

    private function calculateFactionDowntimeSeconds(Character $character): int
    {
        return $this->downtimes($character)->reduce(function (int $total, Downtime $downtime): int {
            if ($downtime->type !== 'faction') {
                return $total;
            }

            return $total + $this->safeInt($downtime->duration);
        }, 0);
    }

    private function adventureCount(Character $character): int
    {
        return $this->adventures($character)->count();
    }

    private function adventures(Character $character): Collection
    {
        if ($character->relationLoaded('adventures')) {
            return $character->adventures;
        }

        return $character->adventures()->get();
    }

    private function downtimes(Character $character): Collection
    {
        if ($character->relationLoaded('downtimes')) {
            return $character->downtimes;
        }

        return $character->downtimes()->get();
    }

    private function additionalBubblesForStartTier(?string $startTier): int
    {
        return match ($startTier) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
    }

    private function safeInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
