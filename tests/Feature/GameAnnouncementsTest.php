<?php

use App\Models\GameAnnouncement;
use App\Models\User;

it('renders the games index for authenticated users', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('games.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('games/index')
        ->where('mode', 'upcoming')
    );
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

it('only returns upcoming announcements on the index endpoint', function () {
    $user = User::factory()->create();

    GameAnnouncement::factory()->count(5)->create([
        'starts_at' => now()->subDays(3),
    ]);
    GameAnnouncement::factory()->count(8)->create([
        'starts_at' => now()->addDays(3),
    ]);

    $response = $this->actingAs($user)->get(route('games.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('games/index')
        ->where('mode', 'upcoming')
        ->has('games', 8)
        ->where('pagination.perPage', 200)
        ->where('pagination.total', 8)
    );
});

it('returns past announcements on the archive endpoint with a fixed page size of 20', function () {
    $user = User::factory()->create();

    GameAnnouncement::factory()->count(25)->create([
        'starts_at' => now()->subDays(3),
    ]);
    GameAnnouncement::factory()->count(4)->create([
        'starts_at' => now()->addDays(3),
    ]);

    $response = $this->actingAs($user)->get(route('games.archive'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('games/index')
        ->where('mode', 'archive')
        ->has('games', 20)
        ->where('pagination.currentPage', 1)
        ->where('pagination.lastPage', 2)
        ->where('pagination.perPage', 20)
        ->where('pagination.total', 25)
    );
});
