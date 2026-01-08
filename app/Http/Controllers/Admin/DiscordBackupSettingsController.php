<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDiscordBackupSettingsRequest;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Http;

class DiscordBackupSettingsController extends Controller
{
    public function refresh(): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return redirect()->back()->withErrors([
                'discord_backup' => 'Bot HTTP ist nicht konfiguriert.',
            ]);
        }

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-channels');
        } catch (\Throwable $error) {
            return redirect()->back()->withErrors([
                'discord_backup' => 'Bot ist nicht erreichbar.',
            ]);
        }

        if (! $response->ok()) {
            return redirect()->back()->withErrors([
                'discord_backup' => 'Bot-Request fehlgeschlagen.',
            ]);
        }

        $payload = $response->json();
        $guilds = is_array($payload['guilds'] ?? null) ? $payload['guilds'] : null;
        if (! is_array($guilds)) {
            return redirect()->back()->withErrors([
                'discord_backup' => 'Ungueltige Bot-Antwort.',
            ]);
        }

        foreach ($guilds as $guild) {
            $guildId = $guild['guild_id'] ?? null;
            $channels = $guild['channels'] ?? null;

            if (! is_string($guildId) || ! is_array($channels)) {
                continue;
            }

            foreach ($channels as $channel) {
                if (! isset($channel['id'], $channel['name'], $channel['type'])) {
                    continue;
                }

                DiscordChannel::query()->updateOrCreate(
                    ['id' => $channel['id']],
                    [
                        'guild_id' => $guildId,
                        'name' => $channel['name'],
                        'type' => $channel['type'],
                        'parent_id' => $channel['parent_id'] ?? null,
                        'is_thread' => (bool) ($channel['is_thread'] ?? false),
                    ]
                );
            }
        }

        return redirect()->back();
    }

    public function update(UpdateDiscordBackupSettingsRequest $request): RedirectResponse
    {
        $guilds = $request->validated()['guilds'] ?? [];

        foreach ($guilds as $guild) {
            $guildId = $guild['guild_id'];
            $channelIds = is_array($guild['channel_ids'] ?? null) ? $guild['channel_ids'] : [];

            $validChannelIds = DiscordChannel::query()
                ->where('guild_id', $guildId)
                ->where('is_thread', false)
                ->whereIn('id', $channelIds)
                ->pluck('id')
                ->all();

            DiscordBackupSetting::query()->updateOrCreate(
                ['guild_id' => $guildId],
                ['channel_ids' => array_values($validChannelIds)]
            );
        }

        return redirect()->back();
    }
}
