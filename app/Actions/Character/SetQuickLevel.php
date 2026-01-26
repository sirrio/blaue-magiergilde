<?php

namespace App\Actions\Character;

use App\Models\Adventure;
use App\Models\Character;
use App\Support\BubbleShopSpendCalculator;
use Illuminate\Support\Facades\DB;

class SetQuickLevel
{
    public function handle(Character $character, int $level): array
    {
        return DB::transaction(function () use ($character, $level): array {
            $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
            $dmBubbles = $this->safeInt($character->dm_bubbles);
            $bubbleSpend = (new BubbleShopSpendCalculator)->total($character);

            $durationBubbleSql = $this->durationBubbleSql();

            $totals = Adventure::query()
                ->where('character_id', $character->id)
                ->whereNull('deleted_at')
                ->selectRaw('
                    COALESCE(SUM('.$durationBubbleSql.' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS total_bubbles,
                    COALESCE(SUM(CASE WHEN is_pseudo = 0 THEN '.$durationBubbleSql.' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END ELSE 0 END), 0) AS real_bubbles,
                    COALESCE(SUM(CASE WHEN is_pseudo = 1 THEN '.$durationBubbleSql.' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END ELSE 0 END), 0) AS pseudo_bubbles
                ')
                ->first();

            $realAdventureBubbles = $this->safeInt($totals?->real_bubbles);
            $pseudoAdventureBubbles = $this->safeInt($totals?->pseudo_bubbles);

            $latestAdventure = Adventure::query()
                ->where('character_id', $character->id)
                ->whereNull('deleted_at')
                ->orderByDesc('start_date')
                ->orderByDesc('id')
                ->first();

            $latestPseudo = ($latestAdventure && $latestAdventure->is_pseudo) ? $latestAdventure : null;
            $latestPseudoBubbles = $latestPseudo
                ? $this->bubblesForAdventure($latestPseudo->duration, (bool) $latestPseudo->has_additional_bubble)
                : 0;

            $immutableAdventureBubbles = $latestPseudo
                ? max(0, $realAdventureBubbles + max(0, $pseudoAdventureBubbles - $latestPseudoBubbles))
                : max(0, $realAdventureBubbles + $pseudoAdventureBubbles);
            $minAllowedLevel = $this->calculateLevelFromBubbles(
                $immutableAdventureBubbles + $dmBubbles + $additionalBubbles - $bubbleSpend,
            );

            if (! $character->is_filler && $level < $minAllowedLevel) {
                return ['ok' => false, 'reason' => 'below_real', 'minLevel' => $minAllowedLevel];
            }

            $requiredAdventureBubbles = $this->calculateRequiredAdventureBubbles(
                $level,
                $dmBubbles,
                $additionalBubbles,
                $bubbleSpend,
            );

            $desiredLatestPseudoBubbles = max(0, $requiredAdventureBubbles - $immutableAdventureBubbles);

            if ($desiredLatestPseudoBubbles === 0) {
                if ($latestPseudo) {
                    $latestPseudo->delete();
                }
            } elseif ($latestPseudo) {
                $latestPseudo->duration = $desiredLatestPseudoBubbles * 10800;
                $latestPseudo->has_additional_bubble = false;
                $latestPseudo->save();
            } else {
                $adventure = new Adventure;
                $adventure->duration = $desiredLatestPseudoBubbles * 10800;
                $adventure->start_date = now()->toDateString();
                $adventure->has_additional_bubble = false;
                $adventure->is_pseudo = true;
                $adventure->character_id = $character->id;
                $adventure->title = 'Simplified tracking adjustment';
                $adventure->game_master = 'Simplified tracking';
                $adventure->notes = 'Auto-generated to align simplified tracking level.';
                $adventure->save();
            }

            return ['ok' => true];
        });
    }

    private function bubblesForAdventure(int $duration, bool $hasAdditionalBubble): int
    {
        return (int) floor($duration / 10800) + ($hasAdditionalBubble ? 1 : 0);
    }

    private function calculateLevelFromBubbles(int $availableBubbles): int
    {
        $effective = max(0, $availableBubbles);
        $level = (int) floor(1 + (sqrt(8 * $effective + 1) - 1) / 2);

        return min(20, max(1, $level));
    }

    private function calculateRequiredAdventureBubbles(
        int $level,
        int $dmBubbles,
        int $additionalBubbles,
        int $bubbleSpend,
    ): int {
        $normalizedLevel = min(20, max(1, $level));
        $targetAvailableBubbles = ($normalizedLevel - 1) * $normalizedLevel / 2;
        $required = $targetAvailableBubbles - $dmBubbles - $additionalBubbles + $bubbleSpend;

        return max(0, $required);
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

    private function durationBubbleSql(): string
    {
        $driver = DB::connection()->getDriverName();

        return match ($driver) {
            'sqlite' => 'CAST(duration / 10800 AS INTEGER)',
            'mysql', 'mariadb' => 'FLOOR(duration / 10800)',
            default => 'FLOOR(duration / 10800)',
        };
    }
}
