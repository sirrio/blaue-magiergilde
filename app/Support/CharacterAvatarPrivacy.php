<?php

namespace App\Support;

use App\Models\Character;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class CharacterAvatarPrivacy
{
    /**
     * @param  Collection<int, Character>|EloquentCollection<int, Character>|iterable<Character>  $characters
     */
    public function maskSelectableCharacters(iterable $characters, ?int $viewerUserId): void
    {
        foreach ($characters as $character) {
            if (! $character instanceof Character) {
                continue;
            }

            $this->maskCharacterAvatar($character, $viewerUserId);
            $character->makeHidden(['user_id', 'private_mode']);
        }
    }

    public function maskLinkedCharacterAvatars(Character $character, ?int $viewerUserId): void
    {
        foreach ($character->allies ?? [] as $ally) {
            $linkedCharacter = $ally->linkedCharacter ?? $ally->linked_character ?? null;
            if ($linkedCharacter instanceof Character) {
                $this->maskCharacterAvatar($linkedCharacter, $viewerUserId);
                $linkedCharacter->makeHidden(['user_id', 'private_mode']);
            }
        }

        foreach ($character->adventures ?? [] as $adventure) {
            foreach ($adventure->allies ?? [] as $ally) {
                $linkedCharacter = $ally->linkedCharacter ?? $ally->linked_character ?? null;
                if ($linkedCharacter instanceof Character) {
                    $this->maskCharacterAvatar($linkedCharacter, $viewerUserId);
                    $linkedCharacter->makeHidden(['user_id', 'private_mode']);
                }
            }
        }
    }

    private function maskCharacterAvatar(Character $character, ?int $viewerUserId): void
    {
        if (! $this->shouldHideAvatar($character, $viewerUserId)) {
            return;
        }

        $character->avatar = '';
    }

    private function shouldHideAvatar(Character $character, ?int $viewerUserId): bool
    {
        if (! (bool) ($character->private_mode ?? false)) {
            return false;
        }

        return (int) ($character->user_id ?? 0) !== (int) ($viewerUserId ?? 0);
    }
}
