<?php

use App\Models\DiscordBotSetting;
use App\Models\User;

it('updates support ticket channel via admin bot settings route', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch(route('admin.settings.bot.owners.update'), [
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

it('clears support ticket channel when empty values are submitted', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    DiscordBotSetting::current()->update([
        'support_ticket_channel_id' => '1234567890123',
        'support_ticket_channel_name' => 'orga-support',
        'support_ticket_channel_guild_id' => '9876543210987',
    ]);

    $this->actingAs($admin)
        ->patch(route('admin.settings.bot.owners.update'), [
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
