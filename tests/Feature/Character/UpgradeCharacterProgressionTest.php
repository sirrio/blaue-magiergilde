<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Models\User;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterBubbleShop;
use App\Support\LevelProgression;
use Illuminate\Support\Facades\Config;

beforeEach(function () {
    Config::set('features.level_curve_upgrade_user_ids', range(1, 10000));
    LevelProgression::clearCache();
});

afterEach(function () {
    LevelProgression::clearCache();
});

function snapshotSpend(Character $character): int
{
    $fresh = $character->fresh('latestAuditSnapshot');

    return (int) ($fresh?->latestAuditSnapshot?->state_after['bubble_shop_spend'] ?? 0);
}

function levelSetCount(Character $character): int
{
    return CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->count();
}

function anchorLevel(Character $character, int $versionId, int $targetLevel, int $targetBubbles): void
{
    $bubblesInLevel = max(0, $targetBubbles - LevelProgression::bubblesRequiredForLevel($targetLevel, $versionId));

    app(CharacterAuditTrail::class)->record($character, 'level.set', delta: [
        'available_bubbles' => $targetBubbles,
        'target_level' => $targetLevel,
        'bubbles_in_level' => $bubblesInLevel,
    ]);
}

it('forbids the progression upgrade route for users outside the beta allowlist', function () {
    Config::set('features.level_curve_upgrade_user_ids', []);

    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => LevelProgression::activeVersionId(),
        'is_filler' => false,
    ]);

    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 2,
        'bubbles_in_level' => 0,
        'allow_outside_range_without_downtime' => true,
    ])->assertForbidden();
});

it('upgrades a character to the active progression version and stores the chosen target level', function () {
    $user = User::factory()->create();
    $originalVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($originalVersionId)->update(['is_active' => false]);

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersionId,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 6,
        'bubbles_in_level' => 0,
        'allow_outside_range_without_downtime' => true,
    ])->assertRedirect();

    $latestAnchor = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    expect($character->fresh()->progression_version_id)->toBe($newVersion->id)
        ->and($latestAnchor)->not->toBeNull()
        ->and($latestAnchor?->delta['target_level'] ?? null)->toBe(6);
});

it('rolls back the version change when the chosen target level is below the new minimum', function () {
    $user = User::factory()->create();
    $originalVersionId = LevelProgression::activeVersionId();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersionId,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 5 * 10800,
        'has_additional_bubble' => false,
        'start_date' => '2026-01-01',
    ]);

    recordCharacterSnapshot($character);

    LevelProgressionVersion::query()->whereKey($originalVersionId)->update(['is_active' => false]);

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level === 1 ? 0 : $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $anchorsBefore = levelSetCount($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 2,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersionId)
        ->and(levelSetCount($character))->toBe($anchorsBefore);
});

it('upgrades an adventure-tracked character without creating a level anchor and only spends bubbles from the current level progress', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => ($level - 1) * 5,
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => false,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 6 * 10800,
        'has_additional_bubble' => false,
        'start_date' => '2026-01-01',
    ]);

    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 6,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();
    recordCharacterSnapshot($character);

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and(snapshotSpend($character))->toBe(1)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(1)
        ->and(levelSetCount($character))->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(6 - snapshotSpend($character), $newVersion->id))->toBe(6);
});

it('supports selecting bubbles within the target level during an adventure-tracking upgrade', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => ($level - 1) * 5,
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => (int) (($level - 1) * $level / 2),
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => false,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 13 * 10800,
        'has_additional_bubble' => false,
        'start_date' => '2026-01-01',
    ]);

    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 5,
        'bubbles_in_level' => 1,
    ])->assertRedirect();

    $character->refresh();
    recordCharacterSnapshot($character);

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and(snapshotSpend($character))->toBe(2)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(2)
        ->and(levelSetCount($character))->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(13 - snapshotSpend($character), $newVersion->id))->toBe(5)
        ->and((13 - snapshotSpend($character)) - LevelProgression::bubblesRequiredForLevel(5, $newVersion->id))->toBe(1);
});

it('allows an adventure-tracked character to choose between the old displayed level and the newly calculated level', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => (int) (($level - 1) * $level / 2),
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    $newCurveTotals = [
        1 => 0,
        2 => 1,
        3 => 3,
        4 => 6,
        5 => 10,
        6 => 15,
        7 => 21,
        8 => 28,
        9 => 36,
        10 => 40,
        11 => 44,
        12 => 48,
        13 => 52,
        14 => 55,
        15 => 60,
        16 => 65,
        17 => 70,
        18 => 75,
        19 => 80,
        20 => 85,
    ];

    foreach ($newCurveTotals as $level => $requiredBubbles) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $requiredBubbles,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => false,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 95 * 10800,
        'has_additional_bubble' => false,
        'start_date' => '2026-01-01',
    ]);

    recordCharacterSnapshot($character);

    expect(LevelProgression::levelFromAvailableBubbles(95, $originalVersion->id))->toBe(14)
        ->and(LevelProgression::levelFromAvailableBubbles(95, $newVersion->id))->toBe(20);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 14,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();
    recordCharacterSnapshot($character);

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and(snapshotSpend($character))->toBe(40)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(40)
        ->and(levelSetCount($character))->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(95 - snapshotSpend($character), $newVersion->id))->toBe(14);
});

it('credits downtime automatically for a manual-tracked character within the current-to-recalculated range', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => (int) (($level - 1) * $level / 2),
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    $newCurveTotals = [
        1 => 0,
        2 => 1,
        3 => 3,
        4 => 6,
        5 => 10,
        6 => 15,
        7 => 21,
        8 => 28,
        9 => 36,
        10 => 40,
        11 => 44,
        12 => 48,
        13 => 52,
        14 => 55,
        15 => 60,
        16 => 65,
        17 => 70,
        18 => 75,
        19 => 80,
        20 => 85,
    ];

    foreach ($newCurveTotals as $level => $requiredBubbles) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $requiredBubbles,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    anchorLevel($character, $originalVersion->id, 14, 91);

    recordCharacterSnapshot($character);

    expect(LevelProgression::levelFromAvailableBubbles(91, $originalVersion->id))->toBe(14)
        ->and(LevelProgression::levelFromAvailableBubbles(91, $newVersion->id))->toBe(20);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 14,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();
    recordCharacterSnapshot($character);
    $latestAnchor = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and(snapshotSpend($character))->toBe(36)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(36)
        ->and($latestAnchor?->delta['target_level'] ?? null)->toBe(14);
});

it('allows a manual-tracked character to choose the current visible level during a curve upgrade and credits downtime automatically', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => (int) (($level - 1) * $level / 2),
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach ([
        1 => 0,
        2 => 1,
        3 => 3,
        4 => 6,
        5 => 10,
        6 => 15,
        7 => 20,
        8 => 25,
        9 => 30,
        10 => 35,
        11 => 40,
        12 => 45,
        13 => 50,
        14 => 55,
        15 => 60,
        16 => 65,
        17 => 70,
        18 => 75,
        19 => 80,
        20 => 85,
    ] as $level => $requiredBubbles) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $requiredBubbles,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    anchorLevel($character, $originalVersion->id, 7, 27);

    recordCharacterSnapshot($character);

    expect(LevelProgression::levelFromAvailableBubbles(27, $originalVersion->id))->toBe(7)
        ->and(27 - LevelProgression::bubblesRequiredForLevel(7, $originalVersion->id))->toBe(6)
        ->and(LevelProgression::levelFromAvailableBubbles(27, $newVersion->id))->toBe(8)
        ->and(27 - LevelProgression::bubblesRequiredForLevel(8, $newVersion->id))->toBe(2);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 7,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();
    recordCharacterSnapshot($character);
    $latestAnchor = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and(snapshotSpend($character))->toBe(7)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(7)
        ->and($latestAnchor?->delta['target_level'] ?? null)->toBe(7);
});

it('allows a manual-tracked character to choose outside the automatic range without downtime credit', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => (int) (($level - 1) * $level / 2),
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach ([
        1 => 0,
        2 => 1,
        3 => 3,
        4 => 6,
        5 => 10,
        6 => 15,
        7 => 21,
        8 => 28,
        9 => 36,
        10 => 40,
        11 => 44,
        12 => 48,
        13 => 52,
        14 => 55,
        15 => 60,
        16 => 65,
        17 => 70,
        18 => 75,
        19 => 80,
        20 => 85,
    ] as $level => $requiredBubbles) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $requiredBubbles,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    anchorLevel($character, $originalVersion->id, 14, 91);

    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 10,
        'bubbles_in_level' => 0,
        'allow_outside_range_without_downtime' => true,
    ])->assertRedirect();

    $character->refresh();
    recordCharacterSnapshot($character);
    $latestAnchor = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and(snapshotSpend($character))->toBe(0)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->count())->toBe(0)
        ->and($latestAnchor?->delta['target_level'] ?? null)->toBe(10);
});

it('does not allow an adventure-tracked character to switch below the current displayed level on the new curve', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => ($level - 1) * 5,
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => false,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 65 * 10800,
        'has_additional_bubble' => false,
        'start_date' => '2026-01-01',
    ]);

    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 13,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    $character->refresh();
    recordCharacterSnapshot($character);

    expect($character->progression_version_id)->toBe($originalVersion->id)
        ->and(snapshotSpend($character))->toBe(0);
});

it('does not allow a pseudo-tracked character to switch above the recalculated level on the new curve', function () {
    $user = User::factory()->create();
    $previousActiveVersionId = LevelProgression::activeVersionId();

    LevelProgressionVersion::query()->whereKey($previousActiveVersionId)->update(['is_active' => false]);

    $originalVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $originalVersion->id,
            'level' => $level,
            'required_bubbles' => $level - 1,
        ]);
    }

    LevelProgression::clearCache();

    $newVersion = LevelProgressionVersion::query()->create([
        'is_active' => true,
    ]);

    LevelProgressionVersion::query()->whereKey($originalVersion->id)->update(['is_active' => false]);

    foreach (range(1, 20) as $level) {
        LevelProgressionEntry::query()->create([
            'version_id' => $newVersion->id,
            'level' => $level,
            'required_bubbles' => ($level - 1) * 5,
        ]);
    }

    LevelProgression::clearCache();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersion->id,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    anchorLevel($character, $originalVersion->id, 5, 4);

    recordCharacterSnapshot($character);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 5,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersion->id);
});
