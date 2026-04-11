<?php

namespace App\Support;

use App\Models\Adventure;
use App\Models\Character;
use App\Models\User;
use Illuminate\Support\Collection;

class CharacterActivityRule
{
    private const MAX_ACTIVE_CHARACTERS = 8;

    private const MIN_BUBBLE_DURATION = 10800;

    public function blocksSubmission(Character $character): bool
    {
        if ($this->blocksFillerSubmission($character)) {
            return true;
        }

        if (! $this->wouldCountAsActiveCharacter($character)) {
            return false;
        }

        return $this->activeCharacterCountForUser($character->user, excludeCharacterId: $character->id) >= self::MAX_ACTIVE_CHARACTERS;
    }

    public function activeCharacterCountForUser(?User $user, ?int $excludeCharacterId = null): int
    {
        if (! $user) {
            return 0;
        }

        return Character::query()
            ->where('user_id', $user->getKey())
            ->whereNull('deleted_at')
            ->whereIn('guild_status', ['approved', 'pending'])
            ->when($excludeCharacterId !== null, fn ($query) => $query->whereKeyNot($excludeCharacterId))
            ->with('adventures')
            ->get()
            ->filter(fn (Character $character): bool => $this->countsAsActiveCharacter($character))
            ->count();
    }

    public function maxActiveCharacters(): int
    {
        return self::MAX_ACTIVE_CHARACTERS;
    }

    public function blocksFillerSubmission(Character $character): bool
    {
        if (! $character->is_filler) {
            return false;
        }

        return $this->submittedFillerCountForUser($character->user, excludeCharacterId: $character->id) >= 1;
    }

    public function submittedFillerCountForUser(?User $user, ?int $excludeCharacterId = null): int
    {
        if (! $user) {
            return 0;
        }

        return Character::query()
            ->where('user_id', $user->getKey())
            ->whereNull('deleted_at')
            ->whereIn('guild_status', ['approved', 'pending'])
            ->where('is_filler', true)
            ->when($excludeCharacterId !== null, fn ($query) => $query->whereKeyNot($excludeCharacterId))
            ->count();
    }

    private function countsAsActiveCharacter(Character $character): bool
    {
        if ($character->trashed()) {
            return false;
        }

        if (! in_array((string) $character->guild_status, ['approved', 'pending'], true)) {
            return false;
        }

        return $this->wouldCountAsActiveCharacter($character);
    }

    private function wouldCountAsActiveCharacter(Character $character): bool
    {
        if ($character->trashed()) {
            return false;
        }

        if ($character->is_filler) {
            return false;
        }

        return in_array($this->calculateTier($character), ['bt', 'lt', 'ht'], true);
    }

    private function calculateTier(Character $character): string
    {
        return match ($this->calculateLevel($character)) {
            1, 2, 3, 4 => 'bt',
            5, 6, 7, 8, 9, 10 => 'lt',
            11, 12, 13, 14, 15, 16 => 'ht',
            17, 18, 19, 20 => 'et',
            default => 'error',
        };
    }

    private function calculateLevel(Character $character): int
    {
        if ($character->is_filler) {
            return 3;
        }

        $bubbles = $this->calculateBubbles($character);
        $additionalBubbles = $this->additionalBubblesForStartTier($character->start_tier);
        $bubbleShopSpend = $this->safeInt($character->bubble_shop_spend);
        $availableBubbles = max(0, $bubbles + $additionalBubbles - $bubbleShopSpend);

        return LevelProgression::levelFromAvailableBubbles($availableBubbles);
    }

    private function calculateBubbles(Character $character): int
    {
        return $this->safeInt($character->dm_bubbles) + $this->calculateAdventureBubbles($character);
    }

    private function calculateAdventureBubbles(Character $character): int
    {
        return $this->adventures($character)->reduce(function (int $bubble, Adventure $adventure): int {
            $duration = $this->safeInt($adventure->duration);
            $bonus = $adventure->has_additional_bubble ? 1 : 0;

            return $bubble + (int) floor($duration / self::MIN_BUBBLE_DURATION) + $bonus;
        }, 0);
    }

    private function adventures(Character $character): Collection
    {
        if ($character->relationLoaded('adventures')) {
            return $character->adventures;
        }

        return $character->adventures()->get();
    }

    private function additionalBubblesForStartTier(?string $startTier): int
    {
        return match (strtolower((string) $startTier)) {
            'lt' => 10,
            'ht' => 55,
            default => 0,
        };
    }

    private function safeInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
