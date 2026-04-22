<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Models\User;
use App\Support\CharacterBubbleShop;
use App\Support\LevelProgression;

beforeEach(function () {
    LevelProgression::clearCache();
});

afterEach(function () {
    LevelProgression::clearCache();
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 6,
        'bubbles_in_level' => 0,
        'allow_outside_range_without_downtime' => true,
    ])->assertRedirect();

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->first();

    expect($character->fresh()->progression_version_id)->toBe($newVersion->id)
        ->and($pseudo)->not->toBeNull()
        ->and($pseudo?->target_level)->toBe(6)
        ->and($pseudo?->progression_version_id)->toBe($newVersion->id);
});

it('rolls back the version change when the chosen target level is below the new minimum', function () {
    $user = User::factory()->create();
    $originalVersionId = LevelProgression::activeVersionId();

    $character = Character::factory()->for($user)->create([
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersionId,
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 5 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

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

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 2,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersionId)
        ->and(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(0);
});

it('upgrades an adventure-tracked character without creating a pseudo adventure and only spends bubbles from the current level progress', function () {
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 6 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 6,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_legacy_spend)->toBe(0)
        ->and($character->bubble_shop_spend)->toBe(1)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(1)
        ->and(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(6 - $character->bubble_shop_spend, $newVersion->id))->toBe(6);
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 13 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 5,
        'bubbles_in_level' => 1,
    ])->assertRedirect();

    $character->refresh();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_legacy_spend)->toBe(0)
        ->and($character->bubble_shop_spend)->toBe(2)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(2)
        ->and(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(13 - $character->bubble_shop_spend, $newVersion->id))->toBe(5)
        ->and((13 - $character->bubble_shop_spend) - LevelProgression::bubblesRequiredForLevel(5, $newVersion->id))->toBe(1);
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 95 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    expect(LevelProgression::levelFromAvailableBubbles(95, $originalVersion->id))->toBe(14)
        ->and(LevelProgression::levelFromAvailableBubbles(95, $newVersion->id))->toBe(20);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 14,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_spend)->toBe(40)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(40)
        ->and(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(0)
        ->and(LevelProgression::levelFromAvailableBubbles(95 - $character->bubble_shop_spend, $newVersion->id))->toBe(14);
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::forceCreate([
        'character_id' => $character->id,
        'title' => 'Pseudo level',
        'duration' => 0,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 14,
        'target_bubbles' => 91,
        'progression_version_id' => $originalVersion->id,
        'start_date' => '2026-01-01',
    ]);

    expect(LevelProgression::levelFromAvailableBubbles(91, $originalVersion->id))->toBe(14)
        ->and(LevelProgression::levelFromAvailableBubbles(91, $newVersion->id))->toBe(20);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 14,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();
    $pseudo = Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->first();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_spend)->toBe(36)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(36)
        ->and($pseudo?->target_level)->toBe(14)
        ->and($pseudo?->progression_version_id)->toBe($newVersion->id);
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::forceCreate([
        'character_id' => $character->id,
        'title' => 'Pseudo level',
        'duration' => 0,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 7,
        'target_bubbles' => 27,
        'progression_version_id' => $originalVersion->id,
        'start_date' => '2026-01-01',
    ]);

    expect(LevelProgression::levelFromAvailableBubbles(27, $originalVersion->id))->toBe(7)
        ->and(27 - LevelProgression::bubblesRequiredForLevel(7, $originalVersion->id))->toBe(6)
        ->and(LevelProgression::levelFromAvailableBubbles(27, $newVersion->id))->toBe(8)
        ->and(27 - LevelProgression::bubblesRequiredForLevel(8, $newVersion->id))->toBe(2);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 7,
        'bubbles_in_level' => 0,
    ])->assertRedirect();

    $character->refresh();
    $pseudo = Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->first();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_spend)->toBe(7)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->value('quantity'))->toBe(7)
        ->and($pseudo?->target_level)->toBe(7)
        ->and($pseudo?->progression_version_id)->toBe($newVersion->id);
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::forceCreate([
        'character_id' => $character->id,
        'title' => 'Pseudo level',
        'duration' => 0,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 14,
        'target_bubbles' => 91,
        'progression_version_id' => $originalVersion->id,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 10,
        'bubbles_in_level' => 0,
        'allow_outside_range_without_downtime' => true,
    ])->assertRedirect();

    $character->refresh();
    $pseudo = Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->first();

    expect($character->progression_version_id)->toBe($newVersion->id)
        ->and($character->bubble_shop_spend)->toBe(0)
        ->and($character->bubbleShopPurchases()->where('type', CharacterBubbleShop::TYPE_DOWNTIME)->count())->toBe(0)
        ->and($pseudo?->target_level)->toBe(10)
        ->and($pseudo?->progression_version_id)->toBe($newVersion->id);
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 65 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 13,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersion->id)
        ->and($character->fresh()->bubble_shop_spend)->toBe(0);
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
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'start_tier' => 'bt',
        'is_filler' => false,
    ]);

    Adventure::forceCreate([
        'character_id' => $character->id,
        'title' => 'Pseudo level',
        'duration' => 0,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 5,
        'target_bubbles' => 4,
        'progression_version_id' => $originalVersion->id,
        'start_date' => '2026-01-01',
    ]);

    $this->actingAs($user)->post(route('characters.upgrade-progression', $character), [
        'level' => 5,
        'bubbles_in_level' => 0,
    ])->assertSessionHasErrors('level');

    expect($character->fresh()->progression_version_id)->toBe($originalVersion->id);
});
