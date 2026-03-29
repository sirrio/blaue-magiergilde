<?php

use App\Models\GameAnnouncement;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('game announcement timestamp repair migration is a safe no-op on sqlite', function () {
    /** @var \Illuminate\Database\Migrations\Migration $migration */
    $migration = require database_path('migrations/2026_03_29_214500_fix_game_announcement_timestamp_columns.php');

    $migration->up();

    $announcement = GameAnnouncement::query()->create([
        'discord_channel_id' => '123',
        'discord_message_id' => '456',
        'discord_author_id' => '789',
        'discord_author_name' => 'Scanner',
        'title' => 'Test game',
        'content' => 'Test content',
        'tier' => 'bt',
        'starts_at' => '2026-03-29 18:00:00',
        'posted_at' => '2026-03-29 16:00:00',
        'confidence' => 95.50,
        'cancelled' => false,
    ]);

    expect($announcement->created_at)->not->toBeNull()
        ->and($announcement->updated_at)->not->toBeNull();
});
