<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\LevelProgressionEntry;
use App\Models\LevelProgressionVersion;
use App\Models\MundaneItemVariant;
use App\Models\User;
use App\Support\LevelProgression;

beforeEach(function () {
    LevelProgression::clearCache();
});

afterEach(function () {
    LevelProgression::clearCache();
});

it('shows the level progression table on admin settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $variant = MundaneItemVariant::factory()->create([
        'name' => 'Preview Test Blade',
        'slug' => 'preview-test-blade',
        'category' => 'weapon',
    ]);

    $response = $this->actingAs($admin)->get(route('admin.settings'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/settings')
        ->has('levelProgression', 20)
        ->has('levelProgressionVersions', 1)
        ->where('mundaneVariants', fn ($variants): bool => collect($variants)->contains(
            fn (array $entry): bool => $entry['id'] === $variant->id
                && $entry['slug'] === 'preview-test-blade'
                && $entry['category'] === 'weapon'
        ))
        ->where('levelProgression.0.level', 1)
        ->where('levelProgression.0.required_bubbles', 0)
        ->where('levelProgression.11.level', 12)
        ->where('levelProgression.11.required_bubbles', 66));
});

it('updates the stored level progression and uses it for the shared calculation', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);
    $pseudoAdventure = Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 66 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => null,
        'progression_version_id' => null,
    ]);

    $entries = LevelProgressionEntry::query()
        ->where('version_id', LevelProgression::activeVersionId())
        ->orderBy('level')
        ->get()
        ->map(fn (LevelProgressionEntry $entry): array => [
            'level' => $entry->level,
            'required_bubbles' => $entry->level >= 12 ? $entry->required_bubbles + 4 : $entry->required_bubbles,
        ])
        ->values()
        ->all();

    $this->actingAs($admin)
        ->patch(route('admin.settings.level-progression.update'), [
            'entries' => $entries,
        ])
        ->assertRedirect()
        ->assertSessionHas('level_progression_update');

    LevelProgression::clearCache();

    $activeVersionId = LevelProgression::activeVersionId();
    $updatedPseudoAdventure = $pseudoAdventure->fresh();

    expect(LevelProgressionVersion::query()->count())->toBe(2)
        ->and(LevelProgressionEntry::query()->where('version_id', $activeVersionId)->where('level', 12)->value('required_bubbles'))->toBe(70)
        ->and(LevelProgression::bubblesRequiredForLevel(12))->toBe(70)
        ->and(LevelProgression::levelFromAvailableBubbles(69))->toBe(11)
        ->and(LevelProgression::levelFromAvailableBubbles(70))->toBe(12)
        ->and($updatedPseudoAdventure?->target_level)->toBe(12)
        ->and($updatedPseudoAdventure?->progression_version_id)->toBe($activeVersionId)
        ->and($updatedPseudoAdventure?->duration)->toBe(70 * 10800);
});

it('realigns mixed real and pseudo adventures to keep the stored target level on curve changes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-01',
    ]);

    $pseudoAdventure = Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 21600,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 3,
        'progression_version_id' => LevelProgression::activeVersionId(),
        'start_date' => '2026-01-02',
    ]);

    $entries = LevelProgressionEntry::query()
        ->where('version_id', LevelProgression::activeVersionId())
        ->orderBy('level')
        ->get()
        ->map(fn (LevelProgressionEntry $entry): array => [
            'level' => $entry->level,
            'required_bubbles' => $entry->level >= 3 ? $entry->required_bubbles + 1 : $entry->required_bubbles,
        ])
        ->values()
        ->all();

    $this->actingAs($admin)
        ->patch(route('admin.settings.level-progression.update'), [
            'entries' => $entries,
        ])
        ->assertRedirect();

    LevelProgression::clearCache();

    $realAdventure = Adventure::query()->where('character_id', $character->id)->where('is_pseudo', false)->first();
    $updatedPseudoAdventure = $pseudoAdventure->fresh();

    expect($realAdventure?->duration)->toBe(10800)
        ->and($updatedPseudoAdventure?->target_level)->toBe(3)
        ->and($updatedPseudoAdventure?->progression_version_id)->toBe(LevelProgression::activeVersionId())
        ->and($updatedPseudoAdventure?->duration)->toBe(32400)
        ->and(LevelProgression::levelFromAvailableBubbles(4))->toBe(3);
});

it('keeps the stored pseudo target level even when real adventures exceed it after a curve change', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 4 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 5,
        'progression_version_id' => LevelProgression::activeVersionId(),
        'start_date' => '2026-01-01',
    ]);

    Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 15 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
        'start_date' => '2026-01-02',
    ]);

    $latestPseudoAdventure = Adventure::factory()->create([
        'character_id' => $character->id,
        'duration' => 5 * 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => true,
        'target_level' => 10,
        'progression_version_id' => LevelProgression::activeVersionId(),
        'start_date' => '2026-01-03',
    ]);

    $entries = collect(range(1, 20))
        ->map(fn (int $level): array => [
            'level' => $level,
            'required_bubbles' => $level - 1,
        ])
        ->all();

    $this->actingAs($admin)
        ->patch(route('admin.settings.level-progression.update'), [
            'entries' => $entries,
        ])
        ->assertRedirect();

    LevelProgression::clearCache();

    $updatedLatestPseudoAdventure = $latestPseudoAdventure->fresh();
    $minimumRealLevel = LevelProgression::levelFromAvailableBubbles(15);

    expect($minimumRealLevel)->toBe(16)
        ->and($updatedLatestPseudoAdventure?->target_level)->toBe(10)
        ->and($updatedLatestPseudoAdventure?->progression_version_id)->toBe(LevelProgression::activeVersionId())
        ->and($updatedLatestPseudoAdventure?->duration)->toBe(0);
});

it('rejects invalid level progression updates', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $entries = LevelProgressionEntry::query()
        ->where('version_id', LevelProgression::activeVersionId())
        ->orderBy('level')
        ->get()
        ->map(fn (LevelProgressionEntry $entry): array => [
            'level' => $entry->level,
            'required_bubbles' => $entry->required_bubbles,
        ])
        ->values()
        ->all();

    $entries[10]['required_bubbles'] = $entries[9]['required_bubbles'];

    $this->actingAs($admin)
        ->patch(route('admin.settings.level-progression.update'), [
            'entries' => $entries,
        ])
        ->assertSessionHasErrors('entries');
});
