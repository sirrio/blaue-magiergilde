<?php

namespace App\Support;

use App\Models\Character;
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
        if ($this->safeInt($character->dm_bubbles) > 0 || $this->safeInt($character->dm_coins) > 0 || $this->safeInt($character->bubble_shop_spend) > 0) {
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

    private function safeInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
