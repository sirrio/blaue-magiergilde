<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('it syncs discord username fields for users with missing profile data', function () {
    config()->set('services.discord.bot_token', 'test-bot-token');

    $missingProfileUser = User::factory()->create([
        'discord_id' => 111111111111111111,
        'discord_username' => null,
        'discord_display_name' => null,
    ]);

    $alreadyFilledUser = User::factory()->create([
        'discord_id' => 222222222222222222,
        'discord_username' => 'kept_username',
        'discord_display_name' => 'Kept Name',
    ]);

    Http::fake([
        'https://discord.com/api/v10/users/111111111111111111' => Http::response([
            'id' => '111111111111111111',
            'username' => 'sirrio',
            'global_name' => 'David',
        ], 200),
    ]);

    $this->artisan('users:sync-discord-profiles --only-missing')
        ->expectsOutputToContain('Sync complete.')
        ->assertExitCode(0);

    expect($missingProfileUser->fresh())
        ->discord_username->toBe('sirrio')
        ->discord_display_name->toBe('David');

    expect($alreadyFilledUser->fresh())
        ->discord_username->toBe('kept_username')
        ->discord_display_name->toBe('Kept Name');
});

test('it fails when bot token is missing', function () {
    config()->set('services.discord.bot_token', null);

    $this->artisan('users:sync-discord-profiles')
        ->expectsOutputToContain('Missing DISCORD_BOT_TOKEN')
        ->assertExitCode(1);
});
