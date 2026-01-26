<?php

use App\Models\Game;
use App\Models\User;

it('stores games with moderated rp coin settings', function (): void {
    $user = User::factory()->create();

    $payload = [
        'title' => 'Moderated RP',
        'tier' => 'bt',
        'duration' => 10800,
        'start_date' => now()->toDateString(),
        'sessions' => 2,
        'has_additional_bubble' => false,
        'coins_disabled' => true,
        'tier_of_month_reward' => null,
        'notes' => 'Moderated RP session',
    ];

    $this->actingAs($user)
        ->post(route('game-master-log.store'), $payload)
        ->assertRedirect();

    $this->assertDatabaseHas('games', [
        'user_id' => $user->id,
        'title' => 'Moderated RP',
        'coins_disabled' => true,
    ]);
});

it('updates games with moderated rp coin settings', function (): void {
    $user = User::factory()->create();
    $game = Game::factory()->create([
        'user_id' => $user->id,
        'coins_disabled' => false,
    ]);

    $payload = [
        'title' => 'Updated',
        'tier' => 'bt',
        'duration' => 10800,
        'start_date' => now()->toDateString(),
        'sessions' => 1,
        'has_additional_bubble' => true,
        'coins_disabled' => true,
        'tier_of_month_reward' => null,
        'notes' => 'Updated notes',
    ];

    $this->actingAs($user)
        ->put(route('game-master-log.update', ['game_master_log' => $game->id]), $payload)
        ->assertRedirect();

    $this->assertDatabaseHas('games', [
        'id' => $game->id,
        'coins_disabled' => true,
        'has_additional_bubble' => true,
    ]);
});
