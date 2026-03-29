<?php

use App\Models\DiscordBotSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    DiscordBotSetting::current()->update([
        'character_approval_channel_id' => '9876543210',
        'character_approval_channel_name' => 'approvals',
        'character_approval_channel_guild_id' => '123123123',
    ]);

    Http::fake([
        'http://bot.test/character-approval/account-created' => Http::response(['status' => 'posted'], 200),
    ]);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'privacy_policy_accepted' => true,
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('characters.index', absolute: false));

    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'simplified_tracking' => null,
        'privacy_policy_accepted_version' => (int) config('legal.privacy_policy.version'),
    ]);

    Http::assertSent(function ($request) {
        return $request->url() === 'http://bot.test/character-approval/account-created'
            && $request['channel_id'] === '9876543210'
            && $request['user_name'] === 'Test User'
            && $request['source'] === 'website';
    });
});

test('new users must accept the privacy policy to register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors(['privacy_policy_accepted']);
    $this->assertGuest();
});
