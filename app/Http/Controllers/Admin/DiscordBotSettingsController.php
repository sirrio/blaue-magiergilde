<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDiscordBotSettingsRequest;
use App\Models\DiscordBotSetting;
use Illuminate\Http\RedirectResponse;

class DiscordBotSettingsController extends Controller
{
    public function update(UpdateDiscordBotSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $updates = [];

        if (array_key_exists('character_approval_channel_id', $validated)) {
            $channelId = trim((string) ($validated['character_approval_channel_id'] ?? ''));
            $updates['character_approval_channel_id'] = $channelId !== '' ? $channelId : null;
        }

        if (array_key_exists('character_approval_channel_name', $validated)) {
            $channelName = trim((string) ($validated['character_approval_channel_name'] ?? ''));
            $updates['character_approval_channel_name'] = $channelName !== '' ? $channelName : null;
        }

        if (array_key_exists('character_approval_channel_guild_id', $validated)) {
            $guildId = trim((string) ($validated['character_approval_channel_guild_id'] ?? ''));
            $updates['character_approval_channel_guild_id'] = $guildId !== '' ? $guildId : null;
        }

        if (array_key_exists('games_channel_id', $validated)) {
            $channelId = trim((string) ($validated['games_channel_id'] ?? ''));
            $updates['games_channel_id'] = $channelId !== '' ? $channelId : null;
        }

        if (array_key_exists('games_channel_name', $validated)) {
            $channelName = trim((string) ($validated['games_channel_name'] ?? ''));
            $updates['games_channel_name'] = $channelName !== '' ? $channelName : null;
        }

        if (array_key_exists('games_channel_guild_id', $validated)) {
            $guildId = trim((string) ($validated['games_channel_guild_id'] ?? ''));
            $updates['games_channel_guild_id'] = $guildId !== '' ? $guildId : null;
        }

        if (array_key_exists('games_scan_years', $validated)) {
            $years = $validated['games_scan_years'];
            $updates['games_scan_years'] = $years !== null ? (int) $years : null;
        }

        if (array_key_exists('games_scan_interval_minutes', $validated)) {
            $minutes = $validated['games_scan_interval_minutes'];
            $updates['games_scan_interval_minutes'] = $minutes !== null ? (int) $minutes : null;
        }

        if (array_key_exists('support_ticket_channel_id', $validated)) {
            $channelId = trim((string) ($validated['support_ticket_channel_id'] ?? ''));
            $updates['support_ticket_channel_id'] = $channelId !== '' ? $channelId : null;
        }

        if (array_key_exists('support_ticket_channel_name', $validated)) {
            $channelName = trim((string) ($validated['support_ticket_channel_name'] ?? ''));
            $updates['support_ticket_channel_name'] = $channelName !== '' ? $channelName : null;
        }

        if (array_key_exists('support_ticket_channel_guild_id', $validated)) {
            $guildId = trim((string) ($validated['support_ticket_channel_guild_id'] ?? ''));
            $updates['support_ticket_channel_guild_id'] = $guildId !== '' ? $guildId : null;
        }

        if ($updates !== []) {
            DiscordBotSetting::current()->update($updates);
        }

        return redirect()->back();
    }
}
