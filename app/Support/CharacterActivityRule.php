<?php

namespace App\Support;

use App\Models\Character;
use App\Models\User;
use Illuminate\Support\Collection;

class CharacterActivityRule
{
    private const MAX_ACTIVE_CHARACTERS = 8;

    private const EXEMPT_HIGH_TIER_CHARACTERS = 2;

    public function __construct(private CharacterProgressionSnapshotResolver $progressionSnapshots = new CharacterProgressionSnapshotResolver) {}

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
            ->with('latestAuditSnapshot')
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
        return strtolower((string) $this->progressionSnapshots->snapshot($character)['tier']);
    }
}
