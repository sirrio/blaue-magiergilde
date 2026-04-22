<?php

namespace App\Http\Controllers\Character;

use App\Actions\Character\SetQuickLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpgradeCharacterProgressionRequest;
use App\Models\Character;
use App\Support\CharacterBubbleShop;
use App\Support\CharacterProgressionState;
use App\Support\LevelProgression;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class UpgradeCharacterProgressionController extends Controller
{
    public function __construct(
        private SetQuickLevel $setQuickLevel,
        private CharacterBubbleShop $bubbleShop = new CharacterBubbleShop,
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
        $allowOutsideRangeWithoutDowntime = $request->boolean('allow_outside_range_without_downtime');

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

        $result = $this->upgradeManualTrackedCharacter(
            $character,
            $activeVersionId,
            $targetLevel,
            $targetBubblesInLevel,
            $allowOutsideRangeWithoutDowntime,
        );

        if (! $result['ok']) {
            $message = $result['message']
                ?? (($result['minLevel'] ?? null)
                    ? 'Level cannot go below '.($result['minLevel']).' with current adventure progress.'
                    : 'Unable to upgrade level progression.');

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
        $minimumAllowedLevel = $currentLevel;
        $minimumAllowedAvailableBubbles = LevelProgression::bubblesRequiredForLevel($minimumAllowedLevel, $activeVersionId);
        $maximumAllowedSpend = $currentSpend + max(0, $availableBubbles - $minimumAllowedAvailableBubbles);

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

        if ($newSpend > $maximumAllowedSpend) {
            return [
                'ok' => false,
                'message' => 'Bubble shop spend cannot reduce the character below the current level floor.',
            ];
        }

        DB::transaction(function () use ($character, $activeVersionId, $newSpend): void {
            $character->forceFill([
                'progression_version_id' => $activeVersionId,
            ]);
            $this->bubbleShop->syncDowntimeSpendTarget($character, $newSpend);
            $character->save();
        });

        return ['ok' => true];
    }

    /**
     * @return array{ok: bool, message?: string, minLevel?: int}
     */
    private function upgradeManualTrackedCharacter(
        Character $character,
        int $activeVersionId,
        int $targetLevel,
        int $targetBubblesInLevel,
        bool $allowOutsideRangeWithoutDowntime,
    ): array {
        $currentVersionId = $character->progression_version_id ?? $activeVersionId;
        $currentAvailableBubbles = $this->currentAvailableBubbles($character);
        $currentLevel = LevelProgression::levelFromAvailableBubbles($currentAvailableBubbles, $currentVersionId);
        $currentBubblesInLevel = max(
            0,
            $currentAvailableBubbles - LevelProgression::bubblesRequiredForLevel($currentLevel, $currentVersionId),
        );
        $recalculatedLevel = LevelProgression::levelFromAvailableBubbles($currentAvailableBubbles, $activeVersionId);
        $currentLevelFloorOnNewCurve = LevelProgression::bubblesRequiredForLevel($currentLevel, $activeVersionId);
        $rangeMinAvailableBubbles = min($currentLevelFloorOnNewCurve, $currentAvailableBubbles);
        $rangeMaxAvailableBubbles = max($currentLevelFloorOnNewCurve, $currentAvailableBubbles);
        $rangeMinLevel = min($currentLevel, $recalculatedLevel);
        $rangeMaxLevel = max($currentLevel, $recalculatedLevel);

        $levelFloor = LevelProgression::bubblesRequiredForLevel($targetLevel, $activeVersionId);
        $maxSelectableBubblesInLevel = $targetLevel >= 20
            ? 0
            : max(0, LevelProgression::bubblesRequiredForNextLevel($targetLevel, $activeVersionId) - 1);
        $clampedBubblesInLevel = max(0, min($targetBubblesInLevel, $maxSelectableBubblesInLevel));
        $targetAvailableBubbles = $levelFloor + $clampedBubblesInLevel;

        if (! $allowOutsideRangeWithoutDowntime) {
            if ($targetLevel < $rangeMinLevel || $targetLevel > $rangeMaxLevel) {
                return [
                    'ok' => false,
                    'message' => "Level can only be chosen between {$rangeMinLevel} and {$rangeMaxLevel} when automatic downtime credit is enabled.",
                ];
            }

            if ($targetAvailableBubbles < $rangeMinAvailableBubbles || $targetAvailableBubbles > $rangeMaxAvailableBubbles) {
                return [
                    'ok' => false,
                    'message' => 'Selected bubble progress is outside the automatic downtime range for this curve change.',
                ];
            }
        }

        $currentSpend = $this->safeInt($character->bubble_shop_spend);
        $newSpend = $allowOutsideRangeWithoutDowntime
            ? $currentSpend
            : max($currentSpend, max(0, $currentAvailableBubbles - $targetAvailableBubbles));
        $result = ['ok' => true];

        try {
            DB::transaction(function () use (
                $character,
                $activeVersionId,
                $targetLevel,
                $clampedBubblesInLevel,
                $allowOutsideRangeWithoutDowntime,
                $newSpend,
                &$result,
            ): void {
                $character->forceFill([
                    'progression_version_id' => $activeVersionId,
                ])->save();

                $result = $this->setQuickLevel->handle(
                    $character->fresh(),
                    $targetLevel,
                    $clampedBubblesInLevel,
                );

                if (! $result['ok']) {
                    throw new \RuntimeException('manual-upgrade-validation');
                }

                if ($allowOutsideRangeWithoutDowntime) {
                    return;
                }

                $updatedCharacter = $character->fresh();
                $this->bubbleShop->syncDowntimeSpendTarget($updatedCharacter, $newSpend);
                $updatedCharacter->save();
            });
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() !== 'manual-upgrade-validation') {
                throw $exception;
            }
        }

        return $result;
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
