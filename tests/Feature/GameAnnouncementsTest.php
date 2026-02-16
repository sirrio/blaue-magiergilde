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

it('paginates game announcements by default', function () {
    $user = User::factory()->create();
    GameAnnouncement::factory()->count(130)->create();

    $response = $this->actingAs($user)->get(route('games.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('games/index')
        ->has('games', 100)
        ->where('pagination.currentPage', 1)
        ->where('pagination.lastPage', 2)
        ->where('pagination.perPage', 100)
        ->where('pagination.total', 130)
    );
});

it('allows changing the game announcement page size', function () {
    $user = User::factory()->create();
    GameAnnouncement::factory()->count(130)->create();

    $response = $this->actingAs($user)->get(route('games.index', ['per_page' => 50]));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('games/index')
        ->has('games', 50)
        ->where('pagination.currentPage', 1)
        ->where('pagination.lastPage', 3)
        ->where('pagination.perPage', 50)
        ->where('pagination.total', 130)
    );
});
