<?php

namespace App\Support;

use App\Models\Character;
use App\Models\CharacterAuditEvent;
use Illuminate\Support\Collection;

class CharacterTrackingHistory
{
    public function filterTrackedRelations(Character $character): Character
    {
        if ($character->relationLoaded('adventures')) {
            $character->setRelation(
                'adventures',
                $this->filterEntries($character, $character->adventures)->each->makeHidden(['deleted_at', 'deleted_by_character']),
            );
        }

        if ($character->relationLoaded('downtimes')) {
            $character->setRelation(
                'downtimes',
                $this->filterEntries($character, $character->downtimes)->each->makeHidden(['deleted_at', 'deleted_by_character']),
            );
        }

        return $character;
    }

    public function canPermanentlyDelete(Character $character): bool
    {
        return $this->permanentDeleteBlockReason($character) === null;
    }

    public function permanentDeleteBlockReason(Character $character): ?string
    {
        if ($this->hasProgressionBalances($character)) {
            return 'Nicht möglich, da der Charakter noch Bubbles oder Coins für die Nachverfolgung enthält.';
        }

        if ($this->relevantEntries($character, 'adventures')->isNotEmpty()) {
            return 'Nicht möglich, da der Charakter noch relevante Adventures für die Nachverfolgung enthält.';
        }

        if ($this->relevantEntries($character, 'downtimes')->isNotEmpty()) {
            return 'Nicht möglich, da der Charakter noch relevante Downtimes für die Nachverfolgung enthält.';
        }

        return null;
    }

    private function hasProgressionBalances(Character $character): bool
    {
        $events = $character->relationLoaded('auditEvents')
            ? $character->getRelation('auditEvents')
            : $character->auditEvents()->get();

        foreach (['dm_bubbles', 'dm_coins', 'bubble_shop_spend'] as $counter) {
            $sum = $events->sum(fn (CharacterAuditEvent $event): int => (int) ($event->delta[$counter] ?? 0));
            if ($sum > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  Collection<int, mixed>  $entries
     * @return Collection<int, mixed>
     */
    private function filterEntries(Character $character, Collection $entries): Collection
    {
        return $entries
            ->filter(function ($entry) use ($character): bool {
                if (! $entry->trashed()) {
                    return true;
                }

                return $character->trashed() && (bool) $entry->deleted_by_character;
            })
            ->values();
    }

    /**
     * @return Collection<int, mixed>
     */
    private function relevantEntries(Character $character, string $relation): Collection
    {
        $entries = $character->relationLoaded($relation)
            ? $character->getRelation($relation)
            : $character->{$relation}()->withTrashed()->get();

        return $this->filterEntries($character, $entries);
    }
}
