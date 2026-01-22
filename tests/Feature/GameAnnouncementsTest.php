<?php

use App\Models\GameAnnouncement;
use App\Models\User;

it('renders the games index for authenticated users', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('games.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->component('games/index'));
});

it('shows the latest sync timestamp when announcements exist', function () {
    $user = User::factory()->create();
    GameAnnouncement::factory()->create([
        'updated_at' => now()->subDay(),
    ]);

    $response = $this->actingAs($user)->get(route('games.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('games/index')
        ->where('lastSyncedAt', GameAnnouncement::query()->max('updated_at'))
    );
});
