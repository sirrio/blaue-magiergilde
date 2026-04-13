<?php

use App\Actions\Character\SetQuickLevel;
use App\Models\Adventure;
use App\Models\Character;
use App\Support\LevelProgression;

it('updates the latest pseudo adventure when it is the most recent adventure', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
    ]);

    $pseudo = Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'start_date' => now()->toDateString(),
        'has_additional_bubble' => false,
        'is_pseudo' => true,
    ]);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    expect($result['ok'])->toBeTrue();
    expect(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(1);
    expect($pseudo->fresh()->duration)->toBe(0);
    expect($pseudo->fresh()->target_level)->toBe(4);
    expect($pseudo->fresh()->progression_version_id)->toBe(LevelProgression::activeVersionId());
});

it('creates a new pseudo adventure when a real adventure follows the latest pseudo', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'start_date' => now()->subDays(2)->toDateString(),
        'has_additional_bubble' => false,
        'is_pseudo' => true,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'start_date' => now()->subDay()->toDateString(),
        'has_additional_bubble' => false,
        'is_pseudo' => false,
    ]);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    expect($result['ok'])->toBeTrue();
    expect(Adventure::query()->where('character_id', $character->id)->where('is_pseudo', true)->count())->toBe(2);
    expect(
        Adventure::query()
            ->where('character_id', $character->id)
            ->where('is_pseudo', true)
            ->orderByDesc('id')
            ->first()?->target_level
    )->toBe(4);
});

it('ignores dm bubbles and bubble shop spend when setting levels in level tracking', function () {
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 5,
        'bubble_shop_spend' => 4,
        'is_filler' => false,
        'simplified_tracking' => true,
    ]);

    $result = app(SetQuickLevel::class)->handle($character, 4);

    expect($result['ok'])->toBeTrue();

    $pseudo = Adventure::query()
        ->where('character_id', $character->id)
        ->where('is_pseudo', true)
        ->first();

    expect($pseudo)->not->toBeNull()
        ->and($pseudo?->duration)->toBe(0)
        ->and($pseudo?->target_level)->toBe(4);
});
