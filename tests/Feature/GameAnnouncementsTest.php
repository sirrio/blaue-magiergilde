<?php

use App\Models\GameAnnouncement;
use App\Models\User;
use Illuminate\Support\Facades\Http;

it('renders the games index for authenticated users', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('games.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->component('games/index'));
});

it('syncs discord games for admins', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    config([
        'services.bot.http_url' => 'https://bot.test',
        'services.bot.http_token' => 'token',
        'services.bot.games_channel_id' => '1463839890365222972',
    ]);

    Http::fake([
        'https://bot.test/discord-games' => Http::response([
            'games' => [
                [
                    'discord_channel_id' => '1463839890365222972',
                    'discord_message_id' => '123456',
                    'discord_author_id' => '999',
                    'discord_author_name' => 'GM',
                    'title' => 'Test Adventure',
                    'content' => 'Test content',
                    'tier' => 'bt',
                    'starts_at' => '2026-01-20 19:30:00',
                    'posted_at' => '2026-01-19T18:00:00Z',
                    'confidence' => 0.9,
                ],
            ],
        ], 200),
    ]);

    $response = $this->actingAs($admin)->post(route('games.sync'));

    $response->assertRedirect();
    expect(GameAnnouncement::query()->where('discord_message_id', '123456')->exists())->toBeTrue();
});

it('returns json for auto sync requests', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    config([
        'services.bot.http_url' => 'https://bot.test',
        'services.bot.http_token' => 'token',
        'services.bot.games_channel_id' => '1463839890365222972',
    ]);

    Http::fake([
        'https://bot.test/discord-games' => Http::response(['games' => []], 200),
    ]);

    $response = $this->actingAs($admin)
        ->withHeader('X-Games-Auto-Sync', '1')
        ->post(route('games.sync'));

    $response->assertSuccessful();
    $response->assertJson(['status' => 'synced', 'count' => 0]);
});
