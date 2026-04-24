<?php

namespace App\Support;

use App\Models\Character;
use Illuminate\Support\Collection;
use RuntimeException;

class CharacterProgressionSnapshotResolver
{
    /**
     * @param  Collection<int, Character>|Character  $characters
     */
    public function attach(Collection|Character $characters): void
    {
        if ($characters instanceof Character) {
            $this->attachToCharacter($characters);

            return;
        }

        $characters->loadMissing('latestAuditSnapshot');
        $characters->each(fn (Character $character): Character => $this->attachToCharacter($character));
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshot(Character $character): array
    {
        $state = $character->relationLoaded('latestAuditSnapshot')
            ? $character->latestAuditSnapshot?->state_after
            : $character->latestAuditSnapshot()->first()?->state_after;

        if ($this->isUsableSnapshot($state)) {
            return $state;
        }

        throw new RuntimeException("Missing progression snapshot for character {$character->id}.");
    }

    private function attachToCharacter(Character $character): Character
    {
        $character->setAttribute('progression_state', $this->snapshot($character));
        $character->unsetRelation('latestAuditSnapshot');

        return $character;
    }

    private function isUsableSnapshot(mixed $state): bool
    {
        return is_array($state)
            && is_numeric($state['level'] ?? null)
            && array_key_exists('bubbles_in_level', $state)
            && array_key_exists('bubbles_required_for_next_level', $state);
    }
}
