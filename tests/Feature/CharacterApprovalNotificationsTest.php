<?php

use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\DiscordBotSetting;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

it('sends a discord DM when a character is approved', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/character-approval/notify' => Http::response(['status' => 'sent'], 200),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $owner = User::factory()->create(['discord_id' => '1234567890']);
    $character = Character::factory()->for($owner)->create(['guild_status' => 'pending']);

    $this->actingAs($admin)->patch(route('admin.character-approvals.update', $character), [
        'guild_status' => 'approved',
    ])->assertRedirect();

    Http::assertSent(function ($request) {
        return $request->url() === 'http://bot.test/character-approval/notify'
            && $request['discord_user_id'] === '1234567890'
            && $request['status'] === 'approved';
    });
});

it('posts a discord announcement when a pending character is created', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/character-approval/pending' => Http::response(['status' => 'posted'], 200),
    ]);

    DiscordBotSetting::current()->update([
        'character_approval_channel_id' => '9876543210',
        'character_approval_channel_name' => 'approvals',
        'character_approval_channel_guild_id' => '123123123',
    ]);

    $characterClass = CharacterClass::factory()->create();
    $owner = User::factory()->create();

    $payload = [
        'name' => 'New Character',
        'class' => [$characterClass->id],
        'external_link' => 'https://example.com/character',
        'start_tier' => 'bt',
        'version' => '2024',
        'faction' => 'none',
        'notes' => 'Test character',
        'dm_bubbles' => 0,
        'dm_coins' => 0,
        'is_filler' => false,
        'bubble_shop_spend' => 0,
        'guild_status' => 'pending',
    ];

    $this->actingAs($owner)->post(route('characters.store'), $payload)->assertRedirect();

    Http::assertSent(function ($request) {
        return $request->url() === 'http://bot.test/character-approval/pending'
            && $request['channel_id'] === '9876543210'
            && $request['character_name'] === 'New Character';
    });
});

it('posts a discord announcement when a draft character is submitted for review', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/character-approval/pending' => Http::response(['status' => 'posted'], 200),
    ]);

    DiscordBotSetting::current()->update([
        'character_approval_channel_id' => '9876543210',
        'character_approval_channel_name' => 'approvals',
        'character_approval_channel_guild_id' => '123123123',
    ]);

    $characterClass = CharacterClass::factory()->create();
    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
    ]);
    $character->characterClasses()->sync([$characterClass->id]);

    $payload = [
        'name' => $character->name,
        'class' => [$characterClass->id],
        'external_link' => $character->external_link,
        'start_tier' => $character->start_tier,
        'version' => $character->version,
        'faction' => $character->faction,
        'notes' => $character->notes,
        'dm_bubbles' => $character->dm_bubbles,
        'dm_coins' => $character->dm_coins,
        'is_filler' => $character->is_filler,
        'bubble_shop_spend' => $character->bubble_shop_spend,
        'guild_status' => 'pending',
    ];

    $this->actingAs($owner)
        ->post(route('characters.update', ['character' => $character, '_method' => 'put']), $payload)
        ->assertRedirect();

    Http::assertSent(function ($request) use ($character) {
        return $request->url() === 'http://bot.test/character-approval/pending'
            && $request['channel_id'] === '9876543210'
            && $request['character_name'] === $character->name;
    });
});

it('removes the discord announcement when a character is deleted', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    Http::fake([
        'http://bot.test/character-approval/delete' => Http::response(['status' => 'deleted'], 200),
    ]);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'pending',
        'approval_discord_channel_id' => '9876543210',
        'approval_discord_message_id' => '1234567890',
    ]);

    $this->actingAs($owner)->delete(route('characters.destroy', $character))->assertRedirect();

    Http::assertSent(function ($request) {
        return $request->url() === 'http://bot.test/character-approval/delete'
            && $request['channel_id'] === '9876543210'
            && $request['message_id'] === '1234567890';
    });

    $character->refresh();
    expect($character->approval_discord_channel_id)->toBeNull()
        ->and($character->approval_discord_message_id)->toBeNull();
});
