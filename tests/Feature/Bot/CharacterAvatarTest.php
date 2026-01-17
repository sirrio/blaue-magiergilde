<?php

use App\Models\Character;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

it('stores a character avatar uploaded by the bot', function () {
    Storage::fake('public');
    Config::set('services.bot.http_token', 'secret');

    $character = Character::factory()->create([
        'avatar' => 'avatars/discord/previous.png',
    ]);

    Storage::disk('public')->put('avatars/discord/previous.png', 'old');

    Http::fake([
        'https://cdn.discordapp.com/*' => Http::response('image-binary', 200, ['Content-Type' => 'image/png']),
    ]);

    $response = $this
        ->withHeaders(['X-Bot-Token' => 'secret'])
        ->postJson('/bot/character-avatars', [
            'character_id' => $character->id,
            'avatar_url' => 'https://cdn.discordapp.com/avatars/test.png',
        ]);

    $response->assertSuccessful();

    $character->refresh();

    expect($character->avatar)
        ->toBeString()
        ->and($character->avatar)
        ->not->toBe('avatars/discord/previous.png');

    Storage::disk('public')->assertMissing('avatars/discord/previous.png');
    Storage::disk('public')->assertExists($character->avatar);
});
