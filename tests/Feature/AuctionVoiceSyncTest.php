<?php

use App\Models\AuctionSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('returns a helpful timeout hint when voice sync times out', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'secret');

    AuctionSetting::query()->create([
        'voice_channel_id' => '123456789012345678',
    ]);

    Http::fake(function () {
        throw new RuntimeException('cURL error 28: Operation timed out after 10003 milliseconds');
    });

    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->postJson(route('admin.auctions.voice.sync'))
        ->assertStatus(502)
        ->assertJsonPath('error', fn (string $message): bool => str_contains($message, 'did not respond in time')
            && str_contains($message, 'check Discord, then retry if needed'));
});
