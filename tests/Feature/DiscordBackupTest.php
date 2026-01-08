<?php

use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

it('rejects bot backup calls without a valid token', function () {
    Config::set('services.bot.http_token', 'secret');

    $this->postJson('/bot/discord-backups/channels', [
        'channels' => [
            [
                'id' => '12345',
                'guild_id' => '67890',
                'name' => 'general',
                'type' => 'GuildText',
            ],
        ],
    ])->assertUnauthorized();
});

it('stores discord channels sent by the bot', function () {
    Config::set('services.bot.http_token', 'secret');

    $this->postJson('/bot/discord-backups/channels', [
        'channels' => [
            [
                'id' => '12345',
                'guild_id' => '67890',
                'name' => 'general',
                'type' => 'GuildText',
                'is_thread' => false,
            ],
        ],
    ], [
        'X-Bot-Token' => 'secret',
    ])->assertOk();

    $channel = DiscordChannel::query()->first();
    expect($channel)->not->toBeNull();
    expect($channel->id)->toBe('12345');
});

it('stores discord messages and updates the channel cursor', function () {
    Config::set('services.bot.http_token', 'secret');

    $this->postJson('/bot/discord-backups/messages', [
        'channel_id' => '12345',
        'guild_id' => '67890',
        'messages' => [
            [
                'id' => '10000',
                'author_id' => '55555',
                'author_name' => 'Alpha',
                'content' => 'First',
                'message_type' => 0,
                'is_pinned' => false,
                'sent_at' => now()->subMinute()->toISOString(),
                'attachments' => [],
            ],
            [
                'id' => '20000',
                'author_id' => '55555',
                'author_name' => 'Alpha',
                'content' => 'Second',
                'message_type' => 0,
                'is_pinned' => false,
                'sent_at' => now()->toISOString(),
                'attachments' => [
                    [
                        'id' => '88888',
                        'filename' => 'example.png',
                        'content_type' => 'image/png',
                        'size' => 1234,
                        'url' => 'https://example.com/example.png',
                    ],
                ],
            ],
        ],
    ], [
        'X-Bot-Token' => 'secret',
    ])->assertOk();

    expect(DiscordMessage::count())->toBe(2);
    expect(DiscordMessageAttachment::count())->toBe(1);

    $channel = DiscordChannel::query()->find('12345');
    expect($channel)->not->toBeNull();
    expect($channel->last_message_id)->toBe('20000');
});

it('stores attachment uploads from the bot', function () {
    Config::set('services.bot.http_token', 'secret');
    Storage::fake('local');

    DiscordChannel::query()->create([
        'id' => '12345',
        'guild_id' => '67890',
        'name' => 'general',
        'type' => 'GuildText',
    ]);

    DiscordMessage::query()->create([
        'id' => '99999',
        'discord_channel_id' => '12345',
        'guild_id' => '67890',
        'author_id' => '55555',
        'author_name' => 'Alpha',
        'message_type' => 0,
        'is_pinned' => false,
        'sent_at' => now(),
    ]);

    $file = UploadedFile::fake()->image('example.png');

    $this->post('/bot/discord-backups/attachments', [
        'discord_message_id' => '99999',
        'attachment_id' => '88888',
        'filename' => 'example.png',
        'content_type' => 'image/png',
        'size' => $file->getSize(),
        'url' => 'https://example.com/example.png',
        'file' => $file,
    ], [
        'X-Bot-Token' => 'secret',
    ])->assertOk();

    $attachment = DiscordMessageAttachment::query()->first();
    expect($attachment)->not->toBeNull();
    expect($attachment->storage_path)->not->toBeNull();

    Storage::disk('local')->assertExists($attachment->storage_path);
});

it('lets admins trigger a discord backup run', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');
    Config::set('app.url', 'http://app.test');

    Http::fake([
        'http://bot.test/discord-backup' => Http::response(['status' => 'started'], 202),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post('/admin/settings/discord-backup')
        ->assertRedirect();

    Http::assertSent(function ($request) {
        return $request->url() === 'http://bot.test/discord-backup'
            && $request->hasHeader('X-Bot-Token', 'secret');
    });
});
