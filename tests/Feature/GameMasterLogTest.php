<?php

use App\Models\Game;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('users can update games without creating new records', function () {
    $user = User::factory()->create();
    $game = Game::factory()->create(['user_id' => $user->id]);
    $payload = [
        'duration' => 7200,
        'start_date' => now()->toDateString(),
        'has_additional_bubble' => true,
        'tier_of_month_reward' => 'bubble',
        'sessions' => 2,
        'tier' => 'lt',
        'notes' => 'Updated notes.',
        'title' => 'Updated title',
    ];

    $response = $this->actingAs($user)->put(route('game-master-log.update', ['game_master_log' => $game->id]), $payload);

    $response->assertRedirect();

    expect(Game::query()->count())->toBe(1);
    $this->assertDatabaseHas('games', [
        'id' => $game->id,
        'title' => 'Updated title',
        'tier' => 'lt',
        'sessions' => 2,
        'notes' => 'Updated notes.',
    ]);
});

test('users can delete games from the game master log', function () {
    $user = User::factory()->create();
    $game = Game::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->delete(route('game-master-log.destroy', ['game_master_log' => $game->id]));

    $response->assertRedirect();
    $this->assertSoftDeleted('games', ['id' => $game->id]);
});
