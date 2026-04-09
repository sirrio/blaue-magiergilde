<?php

use App\Models\LevelProgressionEntry;
use App\Models\User;
use App\Support\LevelProgression;

it('shows the level progression table on admin settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $response = $this->actingAs($admin)->get(route('admin.settings'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/settings')
        ->has('levelProgression', 20)
        ->where('levelProgression.0.level', 1)
        ->where('levelProgression.0.required_bubbles', 0)
        ->where('levelProgression.11.level', 12)
        ->where('levelProgression.11.required_bubbles', 66));
});

it('updates the stored level progression and uses it for the shared calculation', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $entries = LevelProgressionEntry::query()
        ->orderBy('level')
        ->get()
        ->map(fn (LevelProgressionEntry $entry): array => [
            'level' => $entry->level,
            'required_bubbles' => $entry->level === 11 ? 56 : $entry->required_bubbles,
        ])
        ->values()
        ->all();

    $this->actingAs($admin)
        ->patch(route('admin.settings.level-progression.update'), [
            'entries' => $entries,
        ])
        ->assertRedirect();

    LevelProgression::clearCache();

    expect(LevelProgressionEntry::query()->where('level', 11)->value('required_bubbles'))->toBe(56)
        ->and(LevelProgression::bubblesRequiredForLevel(11))->toBe(56)
        ->and(LevelProgression::levelFromAvailableBubbles(55))->toBe(10)
        ->and(LevelProgression::levelFromAvailableBubbles(56))->toBe(11);
});

it('rejects invalid level progression updates', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $entries = LevelProgressionEntry::query()
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
