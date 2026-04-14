<?php

namespace App\Support;

use App\Models\Adventure;
use App\Models\Character;
use App\Models\User;
use Illuminate\Support\Collection;

class CharacterActivityRule
{
    private const MAX_ACTIVE_CHARACTERS = 8;

    private const EXEMPT_HIGH_TIER_CHARACTERS = 2;

    private const MIN_BUBBLE_DURATION = 10800;

    public function __construct(private CharacterProgressionState $progressionState = new CharacterProgressionState) {}

    public function blocksSubmission(Character $character): bool
    {
        if ($this->blocksFillerSubmission($character)) {
            return true;
        }

        if (! $this->wouldCountAsActiveCharacter($character)) {
            return false;
        }

        $activeCharacters = $this->submittedActiveCharactersForUser($character->user, excludeCharacterId: $character->id);
        $usedSlots = $this->consumedGeneralSlots($activeCharacters);
        $candidateCost = $this->generalSlotCostForCharacter($character, $activeCharacters);

        return $usedSlots + $candidateCost > self::MAX_ACTIVE_CHARACTERS;
    }

    public function activeCharacterCountForUser(?User $user, ?int $excludeCharacterId = null): int
    {
        return $this->consumedGeneralSlots($this->submittedActiveCharactersForUser($user, $excludeCharacterId));
    }

    public function maxActiveCharacters(): int
    {
        return self::MAX_ACTIVE_CHARACTERS;
    }

    public function exemptHighTierCharacters(): int
    {
        return self::EXEMPT_HIGH_TIER_CHARACTERS;
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

    private function submittedActiveCharactersForUser(?User $user, ?int $excludeCharacterId = null): Collection
    {
        if (! $user) {
            return collect();
        }

        return Character::query()
            ->where('user_id', $user->getKey())
            ->whereNull('deleted_at')
            ->whereIn('guild_status', ['approved', 'pending'])
            ->when($excludeCharacterId !== null, fn ($query) => $query->whereKeyNot($excludeCharacterId))
            ->with('adventures')
            ->get()
            ->filter(fn (Character $character): bool => $this->countsAsActiveCharacter($character))
            ->values();
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

    private function consumedGeneralSlots(Collection $characters): int
    {
        $highTierCount = $characters
            ->filter(fn (Character $character): bool => $this->calculateTier($character) === 'ht')
            ->count();
        $lowAndBaseTierCount = $characters
            ->filter(fn (Character $character): bool => in_array($this->calculateTier($character), ['bt', 'lt'], true))
            ->count();

        return $lowAndBaseTierCount + max(0, $highTierCount - self::EXEMPT_HIGH_TIER_CHARACTERS);
    }

    private function generalSlotCostForCharacter(Character $character, Collection $existingActiveCharacters): int
    {
        $tier = $this->calculateTier($character);
        if (in_array($tier, ['bt', 'lt'], true)) {
            return 1;
        }

        if ($tier !== 'ht') {
            return 0;
        }

        $highTierCount = $existingActiveCharacters
            ->filter(fn (Character $activeCharacter): bool => $this->calculateTier($activeCharacter) === 'ht')
            ->count();

        return $highTierCount >= self::EXEMPT_HIGH_TIER_CHARACTERS ? 1 : 0;
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
        $bubbleShopSpend = $this->progressionState->bubbleShopSpendForProgression($character);
        $availableBubbles = max(0, $bubbles + $additionalBubbles - $bubbleShopSpend);

        return LevelProgression::levelFromAvailableBubbles($availableBubbles);
    }

    private function calculateBubbles(Character $character): int
    {
        return $this->progressionState->dmBubblesForProgression($character) + $this->calculateAdventureBubbles($character);
    }

    private function calculateAdventureBubbles(Character $character): int
    {
        $adventures = $this->adventures($character)
            ->sortBy([['start_date', 'asc'], ['id', 'asc']])
            ->values();

        $lastPseudoIndex = $adventures->reverse()->search(
            fn (Adventure $a): bool => (bool) $a->is_pseudo,
        );

        if ($lastPseudoIndex === false) {
            return $adventures->reduce(fn (int $sum, Adventure $a): int => $sum + $this->realBubblesFor($a), 0);
        }

        $lastPseudo = $adventures->get($lastPseudoIndex);
        $pseudoBubbles = LevelProgression::bubblesRequiredForLevel(
            max(1, min(20, $this->safeInt($lastPseudo->target_level, 1))),
        );
        $realBubblesAfter = $adventures->slice($lastPseudoIndex + 1)
            ->filter(fn (Adventure $a): bool => ! $a->is_pseudo)
            ->reduce(fn (int $sum, Adventure $a): int => $sum + $this->realBubblesFor($a), 0);

        return $pseudoBubbles + $realBubblesAfter;
    }

    private function realBubblesFor(Adventure $adventure): int
    {
        $duration = $this->safeInt($adventure->duration);

        return (int) floor($duration / self::MIN_BUBBLE_DURATION) + ($adventure->has_additional_bubble ? 1 : 0);
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
