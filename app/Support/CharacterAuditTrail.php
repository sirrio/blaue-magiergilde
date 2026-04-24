<?php

namespace App\Support;

use App\Models\Character;
use App\Models\CharacterAuditEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

class CharacterAuditTrail
{
    public function __construct(
        private readonly CharacterProgressionState $progressionState = new CharacterProgressionState,
        private readonly FactionRankCalculator $factionRankCalculator = new FactionRankCalculator,
    ) {}

    /**
     * @param  array<string, mixed>  $delta
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        Character $character,
        string $action,
        array $delta = [],
        array $metadata = [],
        ?Model $subject = null,
        ?int $actorUserId = null,
        ?Carbon $occurredAt = null,
    ): CharacterAuditEvent {
        $snapshotCharacter = $this->freshCharacter($character);
        $eventOccurredAt = $occurredAt ?? now();

        return CharacterAuditEvent::query()->create([
            'character_id' => $snapshotCharacter->id,
            'actor_user_id' => $actorUserId ?? Auth::id(),
            'action' => $action,
            'occurred_at' => $eventOccurredAt,
            'subject_type' => $subject ? $subject::class : Character::class,
            'subject_id' => $subject?->getKey() ?? $snapshotCharacter->id,
            'delta' => $delta === [] ? null : $delta,
            'state_after' => $this->stateAfter($snapshotCharacter, $action, $delta, $metadata, $subject?->getKey(), $subject ? $subject::class : Character::class, $eventOccurredAt),
            'metadata' => $metadata === [] ? null : $metadata,
        ]);
    }

    /**
     * @param  array<string, mixed>  $pendingDelta
     * @return array<string, mixed>
     */
    public function stateAfter(
        Character $character,
        string $action = 'test.snapshot',
        array $pendingDelta = [],
        array $pendingMetadata = [],
        ?int $pendingSubjectId = null,
        ?string $pendingSubjectType = null,
        ?Carbon $pendingOccurredAt = null,
    ): array {
        $character = $this->freshCharacter($character);
        $pendingEvent = [
            'action' => $action,
            'delta' => $pendingDelta,
            'metadata' => $pendingMetadata,
            'subject_id' => $pendingSubjectId,
            'subject_type' => $pendingSubjectType,
            'occurred_at' => $pendingOccurredAt ?? now(),
        ];

        $progressionVersionId = $this->progressionState->progressionVersionId($character);

        if ($this->isAnchorAction($action)) {
            $availableBubbles = (int) ($pendingDelta['available_bubbles'] ?? $this->progressionState->startTierBonus($character->start_tier));
        } else {
            $availableBubbles = $this->progressionState->availableBubbles($character, $pendingDelta, $pendingOccurredAt);
        }

        $level = $character->is_filler
            ? 3
            : LevelProgression::levelFromAvailableBubbles($availableBubbles, $progressionVersionId);
        $bubblesInLevel = max(0, $availableBubbles - LevelProgression::bubblesRequiredForLevel($level, $progressionVersionId));
        $bubblesForNextLevel = $level >= 20 ? 0 : LevelProgression::bubblesRequiredForNextLevel($level, $progressionVersionId);

        $dmBubbles = $this->progressionState->sumEventDelta($character, 'dm_bubbles', $pendingDelta);
        $dmCoins = $this->progressionState->sumEventDelta($character, 'dm_coins', $pendingDelta);
        $bubbleShopSpend = $this->progressionState->sumEventDelta($character, 'bubble_shop_spend', $pendingDelta);
        $trackedAvailableBubbles = $this->progressionState->trackedAvailableBubbles($character, $pendingDelta);
        $downtimeTotals = $this->progressionState->currentDowntimeTotals($character, $pendingEvent);
        $bubbleShopDowntimeSeconds = $this->progressionState->currentBubbleShopDowntimeSeconds($character, $pendingEvent);
        $bubbleShopQuantities = $this->progressionState->currentBubbleShopQuantities($character, $pendingEvent);
        $hasLevelAnchor = $action === 'level.set' ? true : $this->progressionState->hasLevelAnchor($character);

        return [
            'user_id' => $character->user_id === null ? null : (int) $character->user_id,
            'name' => $character->name,
            'external_link' => $character->external_link,
            'avatar' => $character->avatar,
            'avatar_masked' => (bool) ($character->avatar_masked ?? true),
            'private_mode' => (bool) ($character->private_mode ?? false),
            'start_tier' => $character->start_tier,
            'version' => $character->version,
            'notes' => $character->notes,
            'registration_note' => $character->registration_note,
            'review_note' => $character->review_note,
            'admin_notes' => $character->admin_notes,
            'is_filler' => (bool) ($character->is_filler ?? false),
            'admin_managed' => (bool) ($character->admin_managed ?? false),
            'class_ids' => $this->sortedClassIds($character),
            'bubble_shop_purchases' => $this->bubbleShopPurchasesState($bubbleShopQuantities),
            'level' => $level,
            'tier' => $this->tierForLevel($level),
            'available_bubbles' => $availableBubbles,
            'tracked_available_bubbles' => $trackedAvailableBubbles,
            'bubbles_in_level' => $bubblesInLevel,
            'bubbles_required_for_next_level' => $bubblesForNextLevel,
            'progression_version_id' => $progressionVersionId,
            'simplified_tracking' => (bool) $character->simplified_tracking,
            'has_level_anchor' => $hasLevelAnchor,
            'manual_adventures_count' => $character->manual_adventures_count === null ? null : (int) $character->manual_adventures_count,
            'manual_faction_rank' => $character->manual_faction_rank === null ? null : (int) $character->manual_faction_rank,
            'dm_bubbles' => $dmBubbles,
            'dm_coins' => $dmCoins,
            'bubble_shop_spend' => $bubbleShopSpend,
            'bubble_shop_downtime_seconds' => $bubbleShopDowntimeSeconds,
            'real_adventures_count' => $this->progressionState->currentAdventureCount($character, $pendingEvent),
            'pseudo_adventures_count' => 0,
            'downtime_logged_seconds' => $downtimeTotals['logged'],
            'faction_downtime_seconds' => $downtimeTotals['faction'],
            'other_downtime_seconds' => $downtimeTotals['other'],
            'downtime_total_seconds' => $downtimeTotals['logged'] + $bubbleShopDowntimeSeconds,
            'faction' => $character->faction,
            'faction_rank' => $this->factionRankCalculator->calculate($character, $pendingEvent),
            'guild_status' => $character->guild_status,
        ];
    }

    private function isAnchorAction(string $action): bool
    {
        return in_array($action, CharacterProgressionState::ANCHOR_ACTIONS, true);
    }

    private function freshCharacter(Character $character): Character
    {
        $fresh = Character::query()
            ->withTrashed()
            ->with(['adventures', 'downtimes', 'bubbleShopPurchases', 'auditEvents', 'characterClasses:id'])
            ->find($character->id);

        return $fresh ?? $character;
    }

    /**
     * @return list<int>
     */
    private function sortedClassIds(Character $character): array
    {
        return $character->characterClasses
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @return array<string, array{quantity: int, details: array<string, mixed>|null}>
     */
    private function bubbleShopPurchasesState(array $quantities): array
    {
        return collect(CharacterBubbleShop::purchaseTypes())
            ->mapWithKeys(fn (string $type) => [
                $type => [
                    'quantity' => max(0, (int) ($quantities[$type] ?? 0)),
                    'details' => null,
                ],
            ])
            ->all();
    }

    private function tierForLevel(int $level): string
    {
        return match (true) {
            $level >= 17 => 'et',
            $level >= 11 => 'ht',
            $level >= 5 => 'lt',
            default => 'bt',
        };
    }
}
