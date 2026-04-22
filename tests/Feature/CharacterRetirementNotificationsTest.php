<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\DiscordBotSetting;
use App\Models\User;
use App\Support\CharacterProgressionState;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

it('posts a discord retirement notice when a pending character is deleted', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');
    Config::set('app.url', 'https://blaue-magiergilde.test');

    Http::fake([
        'http://bot.test/character-retirement/post' => Http::response(['status' => 'posted'], 200),
    ]);

    DiscordBotSetting::current()->update([
        'character_retirement_channel_id' => '4455667788990',
        'character_retirement_channel_name' => 'retirements',
        'character_retirement_channel_guild_id' => '123123123',
    ]);

    $owner = User::factory()->create([
        'discord_id' => '1234567890',
    ]);
    $characterClass = CharacterClass::factory()->create([
        'name' => 'Wizard',
    ]);
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'pending',
        'start_tier' => 'bt',
        'dm_bubbles' => 55,
        'avatar' => 'avatars/test-character.png',
        'external_link' => 'https://www.dndbeyond.com/characters/1234567',
    ]);
    $character->characterClasses()->sync([$characterClass->id]);
    Adventure::factory()->for($character)->create([
        'duration' => 10800,
        'has_additional_bubble' => false,
        'is_pseudo' => false,
    ]);
    Adventure::factory()->for($character)->create([
        'duration' => 21600,
        'has_additional_bubble' => true,
        'is_pseudo' => false,
    ]);

    $progressionState = app(CharacterProgressionState::class);
    $expectedLevel = $progressionState->currentLevel($character->fresh()->load('adventures'));
    $expectedTier = match (true) {
        $expectedLevel >= 17 => 'ET',
        $expectedLevel >= 11 => 'HT',
        $expectedLevel >= 5 => 'LT',
        default => 'BT',
    };

    $this->actingAs($owner)
        ->delete(route('characters.destroy', $character))
        ->assertRedirect();

    Http::assertSent(function ($request) use ($character) {
        return $request->url() === 'http://bot.test/character-retirement/post'
            && $request['channel_id'] === '4455667788990'
            && $request['character_id'] === $character->id
            && $request['character_name'] === $character->name
            && $request['previous_status'] === 'pending'
            && $request['character_status'] === 'pending';
    });

    Http::assertSent(function ($request) use ($expectedLevel, $expectedTier) {
        return $request->url() === 'http://bot.test/character-retirement/post'
            && $request['character_level'] === $expectedLevel
            && $request['character_tier'] === $expectedTier
            && $request['character_played_adventures'] === 2
            && $request['character_avatar_url'] === 'https://blaue-magiergilde.test/avatars/masked?path=avatars%2Ftest-character.png';
    });
});

it('marks approved characters as retired before posting the retirement notice', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/character-retirement/post' => Http::response(['status' => 'posted'], 200),
    ]);

    DiscordBotSetting::current()->update([
        'character_retirement_channel_id' => '4455667788990',
        'character_retirement_channel_name' => 'retirements',
        'character_retirement_channel_guild_id' => '123123123',
    ]);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'approved',
    ]);

    $this->actingAs($owner)
        ->delete(route('characters.destroy', $character))
        ->assertRedirect();

    Http::assertSent(function ($request) {
        return $request->url() === 'http://bot.test/character-retirement/post'
            && $request['previous_status'] === 'approved'
            && $request['character_status'] === 'retired';
    });
});

it('does not post a retirement notice for draft character deletions', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    Http::fake();

    DiscordBotSetting::current()->update([
        'character_retirement_channel_id' => '4455667788990',
        'character_retirement_channel_name' => 'retirements',
        'character_retirement_channel_guild_id' => '123123123',
    ]);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
    ]);

    $this->actingAs($owner)
        ->delete(route('characters.destroy', $character))
        ->assertRedirect();

    Http::assertNothingSent();
});
