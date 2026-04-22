<?php

use App\Models\DiscordBotSetting;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

it('updates support ticket channel via admin bot settings route', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch(route('admin.settings.bot.update'), [
            'support_ticket_channel_id' => '1234567890123',
            'support_ticket_channel_name' => 'orga-support',
            'support_ticket_channel_guild_id' => '9876543210987',
        ])
        ->assertRedirect();

    $settings = DiscordBotSetting::current()->fresh();
    expect($settings?->support_ticket_channel_id)->toBe('1234567890123')
        ->and($settings?->support_ticket_channel_name)->toBe('orga-support')
        ->and($settings?->support_ticket_channel_guild_id)->toBe('9876543210987');
});

it('updates character retirement channel via admin bot settings route', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch(route('admin.settings.bot.update'), [
            'character_retirement_channel_id' => '7777777777777',
            'character_retirement_channel_name' => 'character-retirements',
            'character_retirement_channel_guild_id' => '8888888888888',
        ])
        ->assertRedirect();

    $settings = DiscordBotSetting::current()->fresh();
    expect($settings?->character_retirement_channel_id)->toBe('7777777777777')
        ->and($settings?->character_retirement_channel_name)->toBe('character-retirements')
        ->and($settings?->character_retirement_channel_guild_id)->toBe('8888888888888');
});

it('clears support ticket channel when empty values are submitted', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    DiscordBotSetting::current()->update([
        'support_ticket_channel_id' => '1234567890123',
        'support_ticket_channel_name' => 'orga-support',
        'support_ticket_channel_guild_id' => '9876543210987',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.settings.bot.update'), [
            'support_ticket_channel_id' => '',
            'support_ticket_channel_name' => '',
            'support_ticket_channel_guild_id' => '',
        ])
        ->assertRedirect();

    $settings = DiscordBotSetting::current()->fresh();
    expect($settings?->support_ticket_channel_id)->toBeNull()
        ->and($settings?->support_ticket_channel_name)->toBeNull()
        ->and($settings?->support_ticket_channel_guild_id)->toBeNull();
});

it('drops the legacy owner ids column', function () {
    expect(Schema::hasColumn('discord_bot_settings', 'owner_ids'))->toBeFalse();
});
