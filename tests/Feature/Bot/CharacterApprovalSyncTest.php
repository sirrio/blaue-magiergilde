<?php

use App\Models\Character;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Support\Facades\Config;

use function Pest\Laravel\mock;

it('syncs character approvals from the bot', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    $notificationService = mock(CharacterApprovalNotificationService::class);
    $notificationService->shouldReceive('syncAnnouncement')->once()->andReturn(['ok' => true, 'status' => 200]);

    $character = Character::factory()->create();

    $this->withHeader('X-Bot-Token', 'token')
        ->post(route('bot.character-approvals.sync'), [
            'character_id' => $character->id,
        ])
        ->assertOk()
        ->assertJson(['status' => 'synced']);

    $notificationService->shouldHaveReceived('syncAnnouncement')->once();
});

it('removes approval announcements for deleted characters', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    $notificationService = mock(CharacterApprovalNotificationService::class);
    $notificationService->shouldReceive('removeAnnouncement')->once()->andReturn(['ok' => true, 'status' => 204]);

    $character = Character::factory()->create([
        'approval_discord_channel_id' => '123',
        'approval_discord_message_id' => '456',
    ]);
    $character->delete();

    $this->withHeader('X-Bot-Token', 'token')
        ->post(route('bot.character-approvals.sync'), [
            'character_id' => $character->id,
        ])
        ->assertOk()
        ->assertJson(['status' => 'deleted']);

    $character = Character::withTrashed()->find($character->id);
    expect($character->approval_discord_channel_id)->toBeNull();
    expect($character->approval_discord_message_id)->toBeNull();

    $notificationService->shouldHaveReceived('removeAnnouncement')->once();
});
