<?php

use App\Models\Character;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('it backfills discord attachment avatars into local storage', function () {
    Storage::fake('public');

    $target = Character::factory()->create([
        'avatar' => 'https://cdn.discordapp.com/attachments/123/456/token.png?ex=abc',
    ]);
    $untouched = Character::factory()->create([
        'avatar' => 'avatars/existing/local-avatar.png',
    ]);

    Http::fake([
        'https://cdn.discordapp.com/*' => Http::response('fake-image', 200, [
            'Content-Type' => 'image/png',
        ]),
    ]);

    $this->artisan('characters:backfill-discord-avatars')
        ->expectsOutputToContain('Backfill complete.')
        ->assertExitCode(0);

    $target->refresh();
    $untouched->refresh();

    expect($target->avatar)->toStartWith('avatars/discord/');
    expect($target->avatar)->toEndWith('.png');
    Storage::disk('public')->assertExists($target->avatar);

    expect($untouched->avatar)->toBe('avatars/existing/local-avatar.png');
});

test('it supports dry run without writing files or db changes', function () {
    Storage::fake('public');

    $target = Character::factory()->create([
        'avatar' => 'https://cdn.discordapp.com/attachments/999/888/avatar.webp?ex=abc',
    ]);
    $originalAvatar = $target->avatar;

    Http::fake([
        'https://cdn.discordapp.com/*' => Http::response('fake-webp', 200, [
            'Content-Type' => 'image/webp',
        ]),
    ]);

    $this->artisan('characters:backfill-discord-avatars --dry-run')
        ->expectsOutputToContain('Backfill complete.')
        ->assertExitCode(0);

    $target->refresh();
    expect($target->avatar)->toBe($originalAvatar);
    expect(Storage::disk('public')->allFiles('avatars/discord'))->toHaveCount(0);
});
