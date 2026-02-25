<?php

use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\DiscordBotSetting;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Config::set('features.character_status_switch', true);
});

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

it('posts a discord announcement when a newly created draft character is submitted', function () {
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
        'external_link' => 'https://www.dndbeyond.com/characters/3333333',
        'start_tier' => 'bt',
        'version' => '2024',
        'faction' => 'none',
        'notes' => 'Test character',
        'dm_bubbles' => 0,
        'dm_coins' => 0,
        'is_filler' => false,
        'bubble_shop_spend' => 0,
    ];

    $this->actingAs($owner)->post(route('characters.store'), $payload)->assertRedirect();

    $character = Character::query()->where('user_id', $owner->id)->latest('id')->firstOrFail();

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'New register details from owner.',
        ])
        ->assertRedirect();

    Http::assertSent(function ($request) {
        return $request->url() === 'http://bot.test/character-approval/pending'
            && $request['channel_id'] === '9876543210'
            && $request['character_name'] === 'New Character'
            && $request['character_registration_note'] === 'New register details from owner.';
    });
});

it('posts a discord announcement when an existing draft character is submitted for review', function () {
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

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Please review with updated notes.',
        ])
        ->assertRedirect();

    Http::assertSent(function ($request) use ($character) {
        return $request->url() === 'http://bot.test/character-approval/pending'
            && $request['channel_id'] === '9876543210'
            && $request['character_name'] === $character->name
            && $request['character_registration_note'] === 'Please review with updated notes.';
    });
});

it('does not send dashboard URLs as external link in approval announcements', function () {
    Config::set('app.url', 'https://blaue-magiergilde.test');
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

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'external_link' => 'https://blaue-magiergilde.test/characters',
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Check external link filtering.',
        ])
        ->assertRedirect();

    Http::assertSent(function ($request) use ($character) {
        return $request->url() === 'http://bot.test/character-approval/pending'
            && $request['character_name'] === $character->name
            && ($request['external_link'] ?? null) === null;
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
