<?php

namespace App\Http\Controllers\Character;

use App\Actions\Character\SetQuickLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpgradeCharacterProgressionRequest;
use App\Models\Character;
use App\Support\CharacterProgressionState;
use App\Support\LevelProgression;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class UpgradeCharacterProgressionController extends Controller
{
    public function __construct(
        private SetQuickLevel $setQuickLevel,
        private CharacterProgressionState $progressionState = new CharacterProgressionState,
    ) {}

    public function __invoke(UpgradeCharacterProgressionRequest $request, Character $character): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $character->user_id === $user->id, 403);

        if ($character->is_filler) {
            return redirect()->back()->withErrors([
                'level' => 'Filler characters cannot switch to a different level curve.',
            ]);
        }

        $activeVersionId = LevelProgression::activeVersionId();
        $previousVersionId = $character->progression_version_id;
        $targetLevel = $request->integer('level');
        $targetBubblesInLevel = $request->integer('bubbles_in_level', 0);

        if ($this->progressionState->hasPseudoAdventures($character)) {
            $availableBubbles = $this->currentAvailableBubbles($character);
            $maxLevel = LevelProgression::levelFromAvailableBubbles($availableBubbles, $activeVersionId);

            if ($targetLevel > $maxLevel) {
                return redirect()->back()->withErrors([
                    'level' => "Level cannot go above {$maxLevel} on the new curve while a set level exists.",
                ]);
            }
        }

        if (! $this->progressionState->usesManualLevelTracking($character)) {
            $result = $this->upgradeAdventureTrackedCharacter($character, $activeVersionId, $targetLevel, $targetBubblesInLevel);

            if (! $result['ok']) {
                return redirect()->back()->withErrors(['level' => $result['message'] ?? 'Unable to upgrade level progression.']);
            }

            return redirect()->back();
        }

        DB::transaction(function () use ($character, $activeVersionId): void {
            $character->forceFill([
                'progression_version_id' => $activeVersionId,
            ])->save();
        });

        $result = $this->setQuickLevel->handle(
            $character->fresh(),
            $targetLevel,
            $targetBubblesInLevel,
        );

        if (! $result['ok']) {
            $character->forceFill([
                'progression_version_id' => $previousVersionId,
            ])->save();

            $minLevel = $result['minLevel'] ?? null;
            $message = $minLevel
                ? "Level cannot go below {$minLevel} with current adventure progress."
                : 'Unable to upgrade level progression.';

            return redirect()->back()->withErrors(['level' => $message]);
        }

        return redirect()->back();
    }

    /**
     * @return array{ok: bool, message?: string}
     */
    private function upgradeAdventureTrackedCharacter(Character $character, int $activeVersionId, int $targetLevel, int $targetBubblesInLevel): array
    {
        $baseBubbles = $this->baseAdventureTrackedBubbles($character);
        $currentSpend = $this->safeInt($character->bubble_shop_spend);
        $availableBubbles = max(0, $baseBubbles - $currentSpend);
        $autoLevel = LevelProgression::levelFromAvailableBubbles($availableBubbles, $activeVersionId);
        $currentVersionId = $character->progression_version_id ?? $activeVersionId;
        $currentLevel = LevelProgression::levelFromAvailableBubbles($availableBubbles, $currentVersionId);
        $currentBubblesInLevel = max(
            0,
            $availableBubbles - LevelProgression::bubblesRequiredForLevel($currentLevel, $currentVersionId),
        );
        $minimumAllowedAvailableBubbles = LevelProgression::bubblesRequiredForLevel($currentLevel, $activeVersionId) + $currentBubblesInLevel;
        $minimumAllowedLevel = LevelProgression::levelFromAvailableBubbles($minimumAllowedAvailableBubbles, $activeVersionId);

        if ($targetLevel > $autoLevel) {
            return [
                'ok' => false,
                'message' => "Level cannot go above {$autoLevel} on the new curve without a set level.",
            ];
        }

        if ($targetLevel < $minimumAllowedLevel) {
            return [
                'ok' => false,
                'message' => "Level cannot go below {$minimumAllowedLevel} on the new curve.",
            ];
        }

        $levelFloor = LevelProgression::bubblesRequiredForLevel($targetLevel, $activeVersionId);
        $minBubblesInLevel = $targetLevel >= 20
            ? 0
            : max(0, $minimumAllowedAvailableBubbles - $levelFloor);
        $maxBubblesInLevel = $targetLevel >= 20
            ? 0
            : max(0, min(
                LevelProgression::bubblesRequiredForNextLevel($targetLevel, $activeVersionId) - 1,
                $availableBubbles - $levelFloor,
            ));
        $clampedBubblesInLevel = max($minBubblesInLevel, min($targetBubblesInLevel, $maxBubblesInLevel));
        $targetAvailableBubbles = $levelFloor + $clampedBubblesInLevel;

        if ($targetAvailableBubbles > $availableBubbles || $targetAvailableBubbles < $minimumAllowedAvailableBubbles) {
            return [
                'ok' => false,
                'message' => 'Bubble shop spend cannot reduce the character below the available bubble floor.',
            ];
        }

        $newSpend = max($currentSpend, max(0, $baseBubbles - $targetAvailableBubbles));

        DB::transaction(function () use ($character, $activeVersionId, $newSpend): void {
            $character->forceFill([
                'progression_version_id' => $activeVersionId,
                'bubble_shop_spend' => $newSpend,
            ])->save();
        });

        return ['ok' => true];
    }

    private function baseAdventureTrackedBubbles(Character $character): int
    {
        $realAdventureBubbles = $this->safeInt(
            $character->adventures()
                ->whereNull('deleted_at')
                ->where('is_pseudo', false)
                ->selectRaw('COALESCE(SUM('.$this->durationBubbleSql().' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles')
                ->value('bubbles')
        );

        return max(
            0,
            $realAdventureBubbles
            + $this->progressionState->dmBubblesForProgression($character)
            + $this->additionalBubblesForStartTier($character->start_tier),
        );
    }

    private function currentAvailableBubbles(Character $character): int
    {
        $durationBubbleSql = $this->durationBubbleSql();

        $latestPseudo = $character->adventures()
            ->whereNull('deleted_at')
            ->where('is_pseudo', true)
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->first();

        if (! $latestPseudo) {
            return max(
                0,
                $this->baseAdventureTrackedBubbles($character)
                - $this->progressionState->bubbleShopSpendForProgression($character),
            );
        }

        $pseudoBubbles = $latestPseudo->target_bubbles !== null
            ? $this->safeInt($latestPseudo->target_bubbles)
            : LevelProgression::bubblesRequiredForLevel(
                $this->safeInt($latestPseudo->target_level, 1),
                $latestPseudo->progression_version_id,
            );

        $realBubblesAfterPseudo = $this->safeInt(
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
                ->selectRaw('COALESCE(SUM('.$durationBubbleSql.' + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles')
                ->value('bubbles')
        );

        return max(0, $pseudoBubbles + $realBubblesAfterPseudo);
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
