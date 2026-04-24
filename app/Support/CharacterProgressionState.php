<?php

namespace App\Support;

use App\Models\Character;
use App\Models\CharacterAuditEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class CharacterProgressionState
{
    public const ANCHOR_ACTIONS = ['character.created', 'level.set'];

    public function usesManualLevelTracking(Character $character): bool
    {
        return (bool) $character->simplified_tracking || $this->hasLevelAnchor($character);
    }

    public function countsBubbleAdjustments(Character $character): bool
    {
        return ! $character->is_filler;
    }

    public function hasLevelAnchor(Character $character): bool
    {
        $anchor = $this->latestAnchor($character);

        return $anchor !== null && $anchor->action === 'level.set';
    }

    public function progressionVersionId(Character $character): int
    {
        return LevelProgression::versionIdForCharacter($character);
    }

    /**
     * @param  array<string, mixed>  $pendingDelta
     */
    public function availableBubbles(Character $character, array $pendingDelta = [], ?Carbon $pendingOccurredAt = null): int
    {
        if ($character->is_filler) {
            return 0;
        }

        $anchor = $this->latestAnchor($character);

        if ($anchor === null) {
            return max(0, $this->startTierBonus($character->start_tier));
        }

        $anchorBubbles = (int) ($anchor->state_after['available_bubbles'] ?? 0);
        $anchorTs = $anchor->occurred_at->getTimestamp();
        $anchorId = (int) $anchor->id;

        $sum = $this->events($character)
            ->filter(fn (CharacterAuditEvent $event): bool => $this->isAfterAnchor($event, $anchorTs, $anchorId))
            ->sum(fn (CharacterAuditEvent $event): int => (int) ($event->delta['bubbles'] ?? 0));

        $pendingBubbles = (int) ($pendingDelta['bubbles'] ?? 0);
        if ($pendingOccurredAt && $pendingOccurredAt->getTimestamp() < $anchorTs) {
            $pendingBubbles = 0;
        }

        return max(0, $anchorBubbles + $sum + $pendingBubbles);
    }

    /**
     * @param  array<string, mixed>  $pendingDelta
     */
    public function currentLevel(Character $character, array $pendingDelta = [], ?Carbon $pendingOccurredAt = null): int
    {
        if ($character->is_filler) {
            return 3;
        }

        return LevelProgression::levelFromAvailableBubbles(
            $this->availableBubbles($character, $pendingDelta, $pendingOccurredAt),
            $this->progressionVersionId($character),
        );
    }

    /**
     * @param  array<string, mixed>  $pendingDelta
     */
    public function bubblesInCurrentLevel(Character $character, array $pendingDelta = [], ?Carbon $pendingOccurredAt = null): int
    {
        $level = $this->currentLevel($character, $pendingDelta, $pendingOccurredAt);

        return max(
            0,
            $this->availableBubbles($character, $pendingDelta, $pendingOccurredAt)
                - LevelProgression::bubblesRequiredForLevel($level, $this->progressionVersionId($character)),
        );
    }

    public function startTierBonus(?string $startTier): int
    {
        return match (strtolower((string) $startTier)) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
    }

    public function sumEventDelta(Character $character, string $key, array $pendingDelta = []): int
    {
        return $this->events($character)
            ->sum(fn (CharacterAuditEvent $event): int => (int) ($event->delta[$key] ?? 0))
            + (int) ($pendingDelta[$key] ?? 0);
    }

    /**
     * Returns the tracked bubble total without applying any later level anchors.
     *
     * @param  array<string, mixed>  $pendingDelta
     */
    public function trackedAvailableBubbles(Character $character, array $pendingDelta = []): int
    {
        if ($character->is_filler) {
            return 0;
        }

        $createdAnchor = $this->events($character)
            ->filter(fn (CharacterAuditEvent $event): bool => $event->action === 'character.created')
            ->sortBy([
                ['occurred_at', 'asc'],
                ['id', 'asc'],
            ])
            ->last();

        if ($createdAnchor === null) {
            return max(0, $this->startTierBonus($character->start_tier) + (int) ($pendingDelta['bubbles'] ?? 0));
        }

        $createdTs = $createdAnchor->occurred_at->getTimestamp();
        $createdId = (int) $createdAnchor->id;
        $sum = $this->events($character)
            ->filter(fn (CharacterAuditEvent $event): bool => $this->isAtOrAfterAnchor($event, $createdTs, $createdId))
            ->sum(fn (CharacterAuditEvent $event): int => (int) ($event->delta['bubbles'] ?? 0));

        return max(0, $sum + (int) ($pendingDelta['bubbles'] ?? 0));
    }

    public function currentAdventureCount(Character $character, ?array $pendingEvent = null): int
    {
        $activeAdventures = [];

        foreach ($this->orderedEventsWithPending($character, $pendingEvent) as $event) {
            if (! is_array($event)) {
                continue;
            }

            $subjectId = $this->eventSubjectId($event);
            if ($subjectId === null) {
                continue;
            }

            if (($event['action'] ?? null) === 'adventure.created') {
                $activeAdventures[$subjectId] = true;
            }

            if (($event['action'] ?? null) === 'adventure.deleted') {
                unset($activeAdventures[$subjectId]);
            }
        }

        return count($activeAdventures);
    }

    /**
     * @return array{logged: int, faction: int, other: int}
     */
    public function currentDowntimeTotals(Character $character, ?array $pendingEvent = null): array
    {
        $downtimes = [];

        foreach ($this->orderedEventsWithPending($character, $pendingEvent) as $event) {
            if (! is_array($event)) {
                continue;
            }

            $action = (string) ($event['action'] ?? '');
            if (! str_starts_with($action, 'downtime.')) {
                continue;
            }

            $subjectId = $this->eventSubjectId($event);
            if ($subjectId === null) {
                continue;
            }

            if ($action === 'downtime.deleted') {
                unset($downtimes[$subjectId]);

                continue;
            }

            $metadata = $this->eventMetadata($event);
            $after = is_array($metadata['after'] ?? null) ? $metadata['after'] : [];
            $duration = $action === 'downtime.created'
                ? (int) (($event['delta']['downtime_seconds'] ?? 0))
                : (int) ($after['duration'] ?? 0);
            $type = $action === 'downtime.created'
                ? (string) ($metadata['type'] ?? 'other')
                : (string) ($after['type'] ?? $metadata['type'] ?? 'other');

            $downtimes[$subjectId] = [
                'duration' => max(0, $duration),
                'type' => $type === 'faction' ? 'faction' : 'other',
            ];
        }

        $logged = 0;
        $faction = 0;
        $other = 0;

        foreach ($downtimes as $downtime) {
            $duration = (int) ($downtime['duration'] ?? 0);
            $logged += $duration;

            if (($downtime['type'] ?? 'other') === 'faction') {
                $faction += $duration;
            } else {
                $other += $duration;
            }
        }

        return [
            'logged' => $logged,
            'faction' => $faction,
            'other' => $other,
        ];
    }

    /**
     * @return array<string, int>
     */
    public function currentBubbleShopQuantities(Character $character, ?array $pendingEvent = null): array
    {
        $quantities = array_fill_keys(CharacterBubbleShop::purchaseTypes(), 0);

        foreach ($this->orderedEventsWithPending($character, $pendingEvent) as $event) {
            if (! is_array($event)) {
                continue;
            }

            $action = (string) ($event['action'] ?? '');
            if (! in_array($action, ['bubble_shop.updated', 'level_curve.upgraded'], true)) {
                continue;
            }

            $metadata = $this->eventMetadata($event);
            $newQuantities = is_array($metadata['new_quantities'] ?? null) ? $metadata['new_quantities'] : null;

            if ($newQuantities === null) {
                continue;
            }

            foreach (CharacterBubbleShop::purchaseTypes() as $type) {
                $quantities[$type] = max(0, (int) ($newQuantities[$type] ?? 0));
            }
        }

        return $quantities;
    }

    public function currentBubbleShopDowntimeSeconds(Character $character, ?array $pendingEvent = null): int
    {
        $quantities = $this->currentBubbleShopQuantities($character, $pendingEvent);

        return max(0, (int) ($quantities[CharacterBubbleShop::TYPE_DOWNTIME] ?? 0) * 8 * 60 * 60);
    }

    /**
     * @return Collection<int, CharacterAuditEvent>
     */
    private function events(Character $character): Collection
    {
        if ($character->relationLoaded('auditEvents')) {
            return $character->getRelation('auditEvents');
        }

        return $character->auditEvents()->get();
    }

    private function latestAnchor(Character $character): ?CharacterAuditEvent
    {
        return $this->events($character)
            ->filter(fn (CharacterAuditEvent $event): bool => in_array($event->action, self::ANCHOR_ACTIONS, true))
            ->sortBy([
                ['occurred_at', 'asc'],
                ['id', 'asc'],
            ])
            ->last();
    }

    private function isAfterAnchor(CharacterAuditEvent $event, int $anchorTs, int $anchorId): bool
    {
        $ts = $event->occurred_at->getTimestamp();

        if ($ts > $anchorTs) {
            return true;
        }

        return $ts === $anchorTs && (int) $event->id > $anchorId;
    }

    private function isAtOrAfterAnchor(CharacterAuditEvent $event, int $anchorTs, int $anchorId): bool
    {
        $ts = $event->occurred_at->getTimestamp();

        if ($ts > $anchorTs) {
            return true;
        }

        return $ts === $anchorTs && (int) $event->id >= $anchorId;
    }

    /**
     * @param  array{action:string,subject_id?:int|null,subject_type?:string|null,delta?:array<string,mixed>|null,metadata?:array<string,mixed>|null,occurred_at?:Carbon|null} | null  $pendingEvent
     * @return Collection<int, array{action:string,subject_id:int|null,subject_type:string|null,delta:array<string,mixed>,metadata:array<string,mixed>,occurred_at:Carbon,id:int|null}>
     */
    private function orderedEventsWithPending(Character $character, ?array $pendingEvent = null): Collection
    {
        $events = $this->events($character)
            ->map(fn (CharacterAuditEvent $event): array => [
                'id' => (int) $event->id,
                'action' => $event->action,
                'subject_id' => $event->subject_id === null ? null : (int) $event->subject_id,
                'subject_type' => $event->subject_type,
                'delta' => is_array($event->delta) ? $event->delta : [],
                'metadata' => is_array($event->metadata) ? $event->metadata : [],
                'occurred_at' => $event->occurred_at,
            ]);

        if ($pendingEvent !== null) {
            $events->push([
                'id' => PHP_INT_MAX,
                'action' => (string) ($pendingEvent['action'] ?? ''),
                'subject_id' => array_key_exists('subject_id', $pendingEvent) && $pendingEvent['subject_id'] !== null ? (int) $pendingEvent['subject_id'] : null,
                'subject_type' => isset($pendingEvent['subject_type']) ? (string) $pendingEvent['subject_type'] : null,
                'delta' => is_array($pendingEvent['delta'] ?? null) ? $pendingEvent['delta'] : [],
                'metadata' => is_array($pendingEvent['metadata'] ?? null) ? $pendingEvent['metadata'] : [],
                'occurred_at' => $pendingEvent['occurred_at'] instanceof Carbon ? $pendingEvent['occurred_at'] : now(),
            ]);
        }

        return $events->sortBy([
            ['occurred_at', 'asc'],
            ['id', 'asc'],
        ])->values();
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function eventSubjectId(array $event): ?int
    {
        $subjectId = $event['subject_id'] ?? null;

        return is_numeric($subjectId) ? (int) $subjectId : null;
    }

    /**
     * @param  array<string, mixed>  $event
     * @return array<string, mixed>
     */
    private function eventMetadata(array $event): array
    {
        return is_array($event['metadata'] ?? null) ? $event['metadata'] : [];
    }
}
