<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterBubbleShop;
use App\Support\CharacterProgressionState;
use App\Support\LevelProgression;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('uses manual level tracking for simplified_tracking characters', function () {
    $character = Character::factory()->create([
        'simplified_tracking' => true,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    $trail = app(CharacterAuditTrail::class);
    $trail->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 7, 'dm_bubbles' => 7]);
    $trail->record($character, 'bubble_shop.updated', delta: ['bubbles' => -3, 'bubble_shop_spend' => 3]);

    $state = new CharacterProgressionState;

    expect($state->usesManualLevelTracking($character->fresh('auditEvents')))->toBeTrue()
        ->and($state->availableBubbles($character->fresh('auditEvents')))->toBe(4);
});

it('treats level.set as an anchor overriding previous events', function () {
    $character = Character::factory()->create([
        'simplified_tracking' => false,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    $progressionVersionId = LevelProgression::versionIdForCharacter($character);
    $targetLevel = 3;
    $bubblesInLevel = 1;
    $anchorAvailable = LevelProgression::bubblesRequiredForLevel($targetLevel, $progressionVersionId) + $bubblesInLevel;

    $trail = app(CharacterAuditTrail::class);
    $trail->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 9, 'dm_bubbles' => 9]);
    $trail->record($character, 'level.set', delta: [
        'available_bubbles' => $anchorAvailable,
        'target_level' => $targetLevel,
        'bubbles_in_level' => $bubblesInLevel,
    ]);
    $trail->record($character, 'bubble_shop.updated', delta: ['bubbles' => -4, 'bubble_shop_spend' => 4]);

    $state = new CharacterProgressionState;
    $character = $character->fresh('auditEvents');

    expect($state->hasLevelAnchor($character))->toBeTrue()
        ->and($state->usesManualLevelTracking($character))->toBeTrue()
        ->and($state->availableBubbles($character))->toBe($anchorAvailable - 4);
});

it('matches the latest snapshot when rebuilding the current state from events', function () {
    $character = Character::factory()->create([
        'simplified_tracking' => true,
        'start_tier' => 'lt',
        'is_filler' => false,
        'manual_adventures_count' => 12,
        'manual_faction_rank' => 3,
    ]);

    $trail = app(CharacterAuditTrail::class);

    $adventure = new Adventure;
    $adventure->forceFill([
        'character_id' => $character->id,
        'duration' => 21600,
        'game_master' => 'GM',
        'title' => 'Snapshot Adventure',
        'start_date' => now()->subDay()->toDateString(),
        'has_additional_bubble' => true,
        'notes' => null,
    ]);
    $adventure->save();

    $downtime = new Downtime;
    $downtime->forceFill([
        'character_id' => $character->id,
        'duration' => 14400,
        'start_date' => now()->subHours(12)->toDateString(),
        'notes' => null,
        'type' => 'faction',
    ]);
    $downtime->save();

    $adventure = $adventure->fresh();
    $downtime = $downtime->fresh();

    $trail->record($character, 'adventure.created', delta: ['bubbles' => 3], subject: $adventure);
    $trail->record($character, 'downtime.created', delta: ['downtime_seconds' => 14400], metadata: ['type' => 'faction'], subject: $downtime);
    $trail->record($character, 'dm_bubbles.updated', delta: ['bubbles' => 5, 'dm_bubbles' => 5]);
    $trail->record($character, 'dm_coins.updated', delta: ['dm_coins' => 2]);
    $trail->record($character, 'bubble_shop.updated', delta: ['bubbles' => -8, 'bubble_shop_spend' => 8], metadata: [
        'previous_quantities' => array_fill_keys(CharacterBubbleShop::purchaseTypes(), 0),
        'new_quantities' => [
            CharacterBubbleShop::TYPE_SKILL_PROFICIENCY => 1,
            CharacterBubbleShop::TYPE_RARE_LANGUAGE => 0,
            CharacterBubbleShop::TYPE_TOOL_OR_LANGUAGE => 0,
            CharacterBubbleShop::TYPE_DOWNTIME => 2,
        ],
    ]);

    $freshCharacter = $character->fresh('auditEvents', 'latestAuditSnapshot');
    $latestSnapshot = $freshCharacter->latestAuditSnapshot?->state_after;
    $state = app(CharacterProgressionState::class);
    $downtimeTotals = $state->currentDowntimeTotals($freshCharacter);

    expect($latestSnapshot['available_bubbles'] ?? null)->toBe($state->availableBubbles($freshCharacter))
        ->and($latestSnapshot['tracked_available_bubbles'] ?? null)->toBe($state->trackedAvailableBubbles($freshCharacter))
        ->and($latestSnapshot['bubbles_in_level'] ?? null)->toBe($state->bubblesInCurrentLevel($freshCharacter))
        ->and($latestSnapshot['real_adventures_count'] ?? null)->toBe($state->currentAdventureCount($freshCharacter))
        ->and($latestSnapshot['downtime_logged_seconds'] ?? null)->toBe($downtimeTotals['logged'])
        ->and($latestSnapshot['faction_downtime_seconds'] ?? null)->toBe($downtimeTotals['faction'])
        ->and($latestSnapshot['other_downtime_seconds'] ?? null)->toBe($downtimeTotals['other'])
        ->and($latestSnapshot['bubble_shop_downtime_seconds'] ?? null)->toBe($state->currentBubbleShopDowntimeSeconds($freshCharacter));
});
