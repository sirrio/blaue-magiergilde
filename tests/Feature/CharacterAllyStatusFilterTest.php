<?php

use App\Models\Adventure;
use App\Models\Ally;
use App\Models\Character;
use App\Models\User;
use App\Support\CharacterAuditTrail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function recordAllyStatusSnapshot(Character $character): Character
{
    app(CharacterAuditTrail::class)->record($character, 'test.snapshot', metadata: ['hidden_from_history' => true]);

    return $character->fresh('latestAuditSnapshot');
}

it('includes draft guild characters in ally candidates when status switching is disabled', function () {
    Config::set('features.character_status_switch', false);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create(['guild_status' => 'draft']);
    $draftCharacter = Character::factory()->create(['guild_status' => 'draft']);
    $pendingCharacter = Character::factory()->create(['guild_status' => 'pending']);
    $approvedCharacter = Character::factory()->create(['guild_status' => 'approved']);
    $needsChangesCharacter = Character::factory()->create(['guild_status' => 'needs_changes']);
    $retiredCharacter = Character::factory()->create(['guild_status' => 'retired']);
    collect([$character, $draftCharacter, $pendingCharacter, $approvedCharacter, $needsChangesCharacter, $retiredCharacter])
        ->each(fn (Character $candidate): Character => recordAllyStatusSnapshot($candidate));

    $this->actingAs($owner)
        ->get(route('characters.show', $character))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/show')
            ->where('guildCharacters', function ($guildCharacters) use ($draftCharacter, $pendingCharacter, $approvedCharacter, $needsChangesCharacter, $retiredCharacter): bool {
                $ids = collect($guildCharacters)->pluck('id');

                return $ids->contains($draftCharacter->id)
                    && $ids->contains($pendingCharacter->id)
                    && $ids->contains($approvedCharacter->id)
                    && $ids->contains($needsChangesCharacter->id)
                    && ! $ids->contains($retiredCharacter->id);
            }));
});

it('resolves draft guild character ids as allies when status switching is disabled', function () {
    Config::set('features.character_status_switch', false);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create(['guild_status' => 'draft']);
    $draftCharacter = Character::factory()->create(['guild_status' => 'draft']);
    recordAllyStatusSnapshot($character);
    recordAllyStatusSnapshot($draftCharacter);

    $this->actingAs($owner)
        ->post(route('adventures.store'), [
            'duration' => 3600,
            'character_id' => $character->id,
            'start_date' => now()->toDateString(),
            'has_additional_bubble' => false,
            'notes' => null,
            'game_master' => null,
            'title' => 'Draft ally lookup',
            'ally_ids' => [],
            'guild_character_ids' => [$draftCharacter->id],
        ])
        ->assertRedirect();

    $ally = Ally::query()
        ->where('character_id', $character->id)
        ->where('linked_character_id', $draftCharacter->id)
        ->first();

    expect($ally)->not->toBeNull();

    $adventure = Adventure::query()->firstOrFail();
    expect($adventure->allies()->whereKey($ally->id)->exists())->toBeTrue();
});
