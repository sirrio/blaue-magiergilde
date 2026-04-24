<?php

namespace App\Http\Controllers\Character;

use App\Actions\Character\SetQuickLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpgradeCharacterProgressionRequest;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterBubbleShop;
use App\Support\CharacterProgressionSnapshotResolver;
use App\Support\CharacterProgressionState;
use App\Support\FeatureAccess;
use App\Support\LevelProgression;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class UpgradeCharacterProgressionController extends Controller
{
    public function __construct(
        private SetQuickLevel $setQuickLevel,
        private CharacterBubbleShop $bubbleShop = new CharacterBubbleShop,
        private CharacterProgressionState $progressionState = new CharacterProgressionState,
        private CharacterAuditTrail $auditTrail = new CharacterAuditTrail,
        private CharacterProgressionSnapshotResolver $progressionSnapshots = new CharacterProgressionSnapshotResolver,
    ) {}

    public function __invoke(UpgradeCharacterProgressionRequest $request, Character $character): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $character->user_id === $user->id, 403);
        /** TODO: remove this temporary beta guard once level curve upgrades are released for everyone. */
        abort_unless(FeatureAccess::canUseLevelCurveUpgrade($user), 403);

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

        if ($this->progressionState->hasLevelAnchor($character)) {
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

            $this->auditTrail->record($character, 'level_curve.upgraded', delta: $result['delta'] ?? [], metadata: [
                'previous_progression_version_id' => $previousVersionId,
                'new_progression_version_id' => $activeVersionId,
                'target_level' => $targetLevel,
                'target_bubbles_in_level' => $targetBubblesInLevel,
                'tracking_mode' => 'adventure',
                ...($result['metadata'] ?? []),
            ]);

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

        $this->auditTrail->record($character, 'level_curve.upgraded', delta: $result['delta'] ?? [], metadata: [
            'previous_progression_version_id' => $previousVersionId,
            'new_progression_version_id' => $activeVersionId,
            'target_level' => $targetLevel,
            'target_bubbles_in_level' => $targetBubblesInLevel,
            'tracking_mode' => 'level',
            'allow_outside_range_without_downtime' => $allowOutsideRangeWithoutDowntime,
            ...($result['metadata'] ?? []),
        ]);

        return redirect()->back();
    }

    /**
     * @return array{ok: bool, message?: string, delta?: array<string, int>, metadata?: array<string, mixed>}
     */
    private function upgradeAdventureTrackedCharacter(Character $character, int $activeVersionId, int $targetLevel, int $targetBubblesInLevel): array
    {
        $availableBubbles = $this->progressionState->availableBubbles($character);
        $currentSpend = $this->currentBubbleShopSpend($character);
        $baseBubbles = $availableBubbles + $currentSpend;
        $autoLevel = LevelProgression::levelFromAvailableBubbles($availableBubbles, $activeVersionId);
        $currentLevel = $this->currentLevel($character);
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

        $previousDowntimeSeconds = $this->bubbleShop->extraDowntimeSeconds($character);
        $previousQuantities = $this->bubbleShop->quantitiesFor($character);
        $newDowntimeSeconds = $previousDowntimeSeconds;
        $newQuantities = $previousQuantities;

        DB::transaction(function () use ($character, $activeVersionId, $newSpend, &$newDowntimeSeconds, &$newQuantities): void {
            $character->forceFill([
                'progression_version_id' => $activeVersionId,
            ]);
            $this->bubbleShop->syncDowntimeSpendTarget($character, $newSpend);
            $newDowntimeSeconds = $this->bubbleShop->extraDowntimeSeconds($character);
            $newQuantities = $this->bubbleShop->quantitiesFor($character);
            $character->save();
        });

        return ['ok' => true, 'delta' => [
            'bubble_shop_spend' => $newSpend - $currentSpend,
            'bubbles' => $currentSpend - $newSpend,
            'downtime_seconds' => $newDowntimeSeconds - $previousDowntimeSeconds,
        ], 'metadata' => [
            'previous_quantities' => $previousQuantities,
            'new_quantities' => $newQuantities,
        ]];
    }

    /**
     * @return array{ok: bool, message?: string, minLevel?: int, delta?: array<string, int>, metadata?: array<string, mixed>}
     */
    private function upgradeManualTrackedCharacter(
        Character $character,
        int $activeVersionId,
        int $targetLevel,
        int $targetBubblesInLevel,
        bool $allowOutsideRangeWithoutDowntime,
    ): array {
        $currentAvailableBubbles = $this->currentAvailableBubbles($character);
        $currentLevel = $this->currentLevel($character);
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

        $currentSpend = $this->currentBubbleShopSpend($character);
        $newSpend = $allowOutsideRangeWithoutDowntime
            ? $currentSpend
            : max($currentSpend, max(0, $currentAvailableBubbles - $targetAvailableBubbles));
        $result = ['ok' => true];
        $previousDowntimeSeconds = $this->bubbleShop->extraDowntimeSeconds($character);
        $previousQuantities = $this->bubbleShop->quantitiesFor($character);
        $newDowntimeSeconds = $previousDowntimeSeconds;
        $newQuantities = $previousQuantities;

        try {
            DB::transaction(function () use (
                $character,
                $activeVersionId,
                $targetLevel,
                $clampedBubblesInLevel,
                $allowOutsideRangeWithoutDowntime,
                $newSpend,
                &$result,
                &$newDowntimeSeconds,
            ): void {
                $character->forceFill([
                    'progression_version_id' => $activeVersionId,
                ])->save();

                $result = $this->setQuickLevel->handle(
                    $character->fresh(),
                    $targetLevel,
                    $clampedBubblesInLevel,
                    true,
                );

                if (! $result['ok']) {
                    throw new \RuntimeException('manual-upgrade-validation');
                }

                if ($allowOutsideRangeWithoutDowntime) {
                    return;
                }

                $updatedCharacter = $character->fresh();
                $this->bubbleShop->syncDowntimeSpendTarget($updatedCharacter, $newSpend);
                $newDowntimeSeconds = $this->bubbleShop->extraDowntimeSeconds($updatedCharacter);
                $newQuantities = $this->bubbleShop->quantitiesFor($updatedCharacter);
                $updatedCharacter->save();
            });
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() !== 'manual-upgrade-validation') {
                throw $exception;
            }
        }

        $result['delta'] = [
            'bubble_shop_spend' => $newSpend - $currentSpend,
            'bubbles' => $currentSpend - $newSpend,
            'downtime_seconds' => $allowOutsideRangeWithoutDowntime ? 0 : $newDowntimeSeconds - $previousDowntimeSeconds,
        ];
        $result['metadata'] = [
            'previous_quantities' => $previousQuantities,
            'new_quantities' => $allowOutsideRangeWithoutDowntime ? $previousQuantities : $newQuantities,
        ];

        return $result;
    }

    private function currentAvailableBubbles(Character $character): int
    {
        return (int) $this->progressionSnapshots->snapshot($character)['available_bubbles'];
    }

    private function currentLevel(Character $character): int
    {
        return (int) $this->progressionSnapshots->snapshot($character)['level'];
    }

    private function currentBubbleShopSpend(Character $character): int
    {
        return (int) ($this->progressionSnapshots->snapshot($character)['bubble_shop_spend'] ?? 0);
    }
}
