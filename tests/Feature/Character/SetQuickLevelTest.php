<?php

use App\Actions\Character\SetQuickLevel;
use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Support\LevelProgression;

beforeEach(function () {
    LevelProgression::clearCache();
});

afterEach(function () {
    LevelProgression::clearCache();
});

it('records a new level.set event when called twice in a row', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    recordCharacterSnapshot($character);

    $first = app(SetQuickLevel::class)->handle($character, 4);
    recordCharacterSnapshot($character);
    $second = app(SetQuickLevel::class)->handle($character, 5);

    expect($first['ok'])->toBeTrue()
        ->and($second['ok'])->toBeTrue();

    $anchorCount = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->count();

    expect($anchorCount)->toBe(2);
});

it('anchors against the current snapshot-adjusted progression when setting levels in level tracking', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 5, 'dm_bubbles' => 5]);
    app(\App\Support\CharacterAuditTrail::class)->record($character, 'bubble_shop.updated', delta: ['bubbles' => -4, 'bubble_shop_spend' => 4]);

    recordCharacterSnapshot($character);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    expect($result['ok'])->toBeTrue();

    $levelAnchor = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    $expectedFloor = LevelProgression::bubblesRequiredForLevel(4, $character->progression_version_id);

    expect($levelAnchor)->not->toBeNull()
        ->and($levelAnchor?->delta['target_level'] ?? null)->toBe(4)
        ->and($levelAnchor?->delta['available_bubbles'] ?? null)->toBe($expectedFloor);
});

it('uses the character progression version instead of the active version', function () {
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

    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'is_filler' => false,
        'simplified_tracking' => true,
        'progression_version_id' => $originalVersionId,
    ]);

    recordCharacterSnapshot($character);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    $levelAnchor = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'level.set')
        ->latest('id')
        ->first();

    $expectedFloor = LevelProgression::bubblesRequiredForLevel(4, $originalVersionId);

    expect($result['ok'])->toBeTrue()
        ->and($levelAnchor)->not->toBeNull()
        ->and($levelAnchor?->delta['target_level'] ?? null)->toBe(4)
        ->and($levelAnchor?->delta['available_bubbles'] ?? null)->toBe($expectedFloor);
});
