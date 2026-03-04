<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('bot can delete a discord linked account', function () {
    config()->set('services.bot.http_token', 'test-bot-token');

    $user = User::factory()->create([
        'discord_id' => '137565166001848320',
    ]);

    $response = $this
        ->withHeader('X-Bot-Token', 'test-bot-token')
        ->deleteJson(route('bot.account.destroy'), [
            'actor_discord_id' => '137565166001848320',
        ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'deleted',
        ]);

    $this->assertSoftDeleted($user);
});

test('bot account deletion requires a valid bot token', function () {
    config()->set('services.bot.http_token', 'test-bot-token');

    User::factory()->create([
        'discord_id' => '137565166001848320',
    ]);

    $response = $this->deleteJson(route('bot.account.destroy'), [
        'actor_discord_id' => '137565166001848320',
    ]);

    $response->assertUnauthorized();
});

test('bot account deletion returns not found for unknown discord user', function () {
    config()->set('services.bot.http_token', 'test-bot-token');

    $response = $this
        ->withHeader('X-Bot-Token', 'test-bot-token')
        ->deleteJson(route('bot.account.destroy'), [
            'actor_discord_id' => '999999999999999999',
        ]);

    $response->assertNotFound()
        ->assertJson([
            'error' => 'Linked account not found.',
        ]);
});
