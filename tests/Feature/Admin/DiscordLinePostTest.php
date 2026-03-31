<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('posts trimmed non-empty lines to the bot endpoint', function () {
    config()->set('services.bot.http_url', 'http://bot.test');
    config()->set('services.bot.http_token', 'secret-token');

    Http::fake([
        'http://bot.test/discord-line-post' => Http::response([
            'status' => 'posted',
            'posted_lines' => 3,
        ]),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);

    $response = $this->actingAs($admin)->post(route('admin.settings.discord.line-post'), [
        'channel_id' => '1234567890',
        'lines' => " First line \n\nSecond line\r\n  Third line  ",
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    Http::assertSent(function (Request $request): bool {
        return $request->url() === 'http://bot.test/discord-line-post'
            && $request->hasHeader('X-Bot-Token', 'secret-token')
            && $request['channel_id'] === '1234567890'
            && $request['lines'] === ['First line', 'Second line', 'Third line'];
    });
});

it('rejects empty line payloads before calling the bot', function () {
    config()->set('services.bot.http_url', 'http://bot.test');
    config()->set('services.bot.http_token', 'secret-token');

    Http::fake();

    $admin = User::factory()->create(['is_admin' => true]);

    $response = $this->from(route('admin.settings'))
        ->actingAs($admin)
        ->post(route('admin.settings.discord.line-post'), [
            'channel_id' => '1234567890',
            'lines' => " \n \r\n\t ",
        ]);

    $response->assertRedirect(route('admin.settings'));
    $response->assertSessionHasErrors(['lines']);

    Http::assertNothingSent();
});
