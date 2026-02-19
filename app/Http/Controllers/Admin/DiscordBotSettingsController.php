<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDiscordBotSettingsRequest;
use App\Models\DiscordBotSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Http;

class DiscordBotSettingsController extends Controller
{
    public function status(): JsonResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return response()->json([
                'error' => 'Bot HTTP is not configured.',
            ], 422);
        }

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->get(rtrim($botUrl, '/').'/discord-owners/status');
        } catch (\Throwable $error) {
            return response()->json([
                'error' => 'Bot is not reachable.',
            ], 503);
        }

        if (! $response->ok()) {
            return response()->json([
                'error' => 'Bot request failed.',
            ], 502);
        }

        return response()->json($response->json());
    }

    public function update(UpdateDiscordBotSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $updates = [];

        if (array_key_exists('owner_ids', $validated)) {
            $raw = (string) ($validated['owner_ids'] ?? '');

            $ownerIds = collect(explode(',', $raw))
                ->map(fn ($id) => trim($id))
                ->filter(fn (string $id) => preg_match('/^[0-9]{5,}$/', $id))
                ->values()
                ->all();

            $updates['owner_ids'] = $ownerIds;
        }

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
