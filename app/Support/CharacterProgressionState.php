<?php

namespace App\Support;

use App\Models\Adventure;
use App\Models\Character;
use Illuminate\Support\Collection;

class CharacterProgressionState
{
    public function usesManualLevelTracking(Character $character): bool
    {
        return (bool) $character->simplified_tracking || $this->hasPseudoAdventures($character);
    }

    public function countsBubbleAdjustments(Character $character): bool
    {
        return ! $this->usesManualLevelTracking($character);
    }

    public function dmBubblesForProgression(Character $character): int
    {
        if (! $this->countsBubbleAdjustments($character)) {
            return 0;
        }

        return $this->safeInt($character->dm_bubbles);
    }

    public function bubbleShopSpendForProgression(Character $character): int
    {
        if (! $this->countsBubbleAdjustments($character)) {
            return 0;
        }

        return $this->safeInt($character->bubble_shop_spend);
    }

    public function hasPseudoAdventures(Character $character): bool
    {
        return $this->adventures($character)
            ->contains(fn (Adventure $adventure): bool => ! $adventure->trashed() && (bool) $adventure->is_pseudo);
    }

    public function progressionVersionId(Character $character): int
    {
        return LevelProgression::versionIdForCharacter($character);
    }

    /**
     * @return Collection<int, Adventure>
     */
    private function adventures(Character $character): Collection
    {
        if ($character->relationLoaded('adventures')) {
            return $character->adventures;
        }

        return $character->adventures()->get();
    }

    private function safeInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
