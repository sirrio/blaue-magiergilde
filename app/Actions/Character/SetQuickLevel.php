<?php

namespace App\Actions\Character;

use App\Models\Adventure;
use App\Models\Character;
use App\Support\CharacterProgressionState;
use App\Support\LevelProgression;
use Illuminate\Support\Facades\DB;

class SetQuickLevel
{
    public function __construct(private CharacterProgressionState $progressionState = new CharacterProgressionState) {}

    public function handle(Character $character, int $level): array
    {
        return DB::transaction(function () use ($character, $level): array {
            $activeVersionId = LevelProgression::activeVersionId();
            $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
            $dmBubbles = $this->progressionState->dmBubblesForProgression($character);
            $bubbleSpend = $this->progressionState->bubbleShopSpendForProgression($character);

            $durationBubbleSql = $this->durationBubbleSql();

            $latestPseudo = Adventure::query()
                ->where('character_id', $character->id)
                ->whereNull('deleted_at')
                ->where('is_pseudo', true)
                ->orderByDesc('start_date')
                ->orderByDesc('id')
                ->first();

            $latestAdventure = Adventure::query()
                ->where('character_id', $character->id)
                ->whereNull('deleted_at')
                ->orderByDesc('start_date')
                ->orderByDesc('id')
                ->first();

            $latestPseudoIsLast = $latestPseudo && $latestAdventure && $latestPseudo->id === $latestAdventure->id;

            // Only real adventures AFTER the last pseudo count towards the
            // immutable floor — the pseudo overrides everything before it.
            $realBubblesAfterLastPseudo = $latestPseudo
                ? $this->safeInt(
                    Adventure::query()
                        ->where('character_id', $character->id)
                        ->whereNull('deleted_at')
                        ->where('is_pseudo', false)
                        ->where(function ($q) use ($latestPseudo) {
                            $q->where('start_date', '>', $latestPseudo->start_date)
                                ->orWhere(function ($q2) use ($latestPseudo) {
                                    $q2->where('start_date', $latestPseudo->start_date)
                                        ->where('id', '>', $latestPseudo->id);
                                });
                        })
                        ->selectRaw('COALESCE(SUM('.$durationBubbleSql.' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles')
                        ->value('bubbles')
                )
                : 0;

            if (! $latestPseudo) {
                $allBubbles = $this->safeInt(
                    Adventure::query()
                        ->where('character_id', $character->id)
                        ->whereNull('deleted_at')
                        ->selectRaw('COALESCE(SUM('.$durationBubbleSql.' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles')
                        ->value('bubbles')
                );
                $immutableBubbles = max(0, $allBubbles);
            } else {
                $immutableBubbles = max(0, $realBubblesAfterLastPseudo);
            }

            $minAllowedLevel = LevelProgression::levelFromAvailableBubbles(
                $immutableBubbles + $dmBubbles + $additionalBubbles - $bubbleSpend,
            );

            if (! $character->is_filler && $level < $minAllowedLevel) {
                return ['ok' => false, 'reason' => 'below_real', 'minLevel' => $minAllowedLevel];
            }

            // The pseudo-adventure uses target_level directly — no duration needed.
            $editablePseudo = $latestPseudoIsLast ? $latestPseudo : null;
            $needsPseudo = $level > $minAllowedLevel || $latestPseudo;

            if (! $needsPseudo) {
                return ['ok' => true];
            }

            if ($level <= $minAllowedLevel) {
                if ($editablePseudo) {
                    $editablePseudo->delete();
                }

                return ['ok' => true];
            }

            // target_bubbles = exact bubble floor for the chosen level.  The user
            // explicitly selected $level, so we start precisely at its threshold.
            // dm, start_tier and shop-spend are NOT added here: in the new system
            // those adjustments are ignored for pseudo-chars (they were baked into
            // the old-style pseudo's duration and are irrelevant going forward).
            $targetBubbles = LevelProgression::bubblesRequiredForLevel($level);

            if ($editablePseudo) {
                $editablePseudo->duration = 0;
                $editablePseudo->has_additional_bubble = false;
                $editablePseudo->target_level = $level;
                $editablePseudo->target_bubbles = $targetBubbles;
                $editablePseudo->progression_version_id = $activeVersionId;
                $editablePseudo->save();
            } else {
                $adventure = new Adventure;
                $adventure->duration = 0;
                $adventure->start_date = now()->toDateString();
                $adventure->has_additional_bubble = false;
                $adventure->is_pseudo = true;
                $adventure->target_level = $level;
                $adventure->target_bubbles = $targetBubbles;
                $adventure->progression_version_id = $activeVersionId;
                $adventure->character_id = $character->id;
                $adventure->title = 'Level tracking adjustment';
                $adventure->game_master = 'Level tracking';
                $adventure->notes = 'Auto-generated to align the level tracking value.';
                $adventure->save();
            }

            return ['ok' => true];
        });
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
