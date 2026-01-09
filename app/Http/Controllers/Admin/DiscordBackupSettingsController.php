<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDiscordBackupSettingsRequest;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class DiscordBackupSettingsController extends Controller
{
    public function refresh(): JsonResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $includeThreads = request()->boolean('include_threads', false);
        $includeArchivedThreads = request()->boolean('include_archived_threads', false);
        $includePrivateThreads = request()->boolean('include_private_threads', false);

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return response()->json([
                'error' => 'Bot HTTP is not configured.',
            ], 422);
        }

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-channels', [
                    'include_threads' => $includeThreads,
                    'include_archived_threads' => $includeArchivedThreads,
                    'include_private_threads' => $includePrivateThreads,
                ]);
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

        $payload = $response->json();
        $guilds = is_array($payload['guilds'] ?? null) ? $payload['guilds'] : null;
        if (! is_array($guilds)) {
            return response()->json([
                'error' => 'Invalid bot response.',
            ], 502);
        }

        return response()->json([
            'guilds' => $guilds,
        ]);
    }

    public function update(UpdateDiscordBackupSettingsRequest $request): RedirectResponse
    {
        $guilds = $request->validated()['guilds'] ?? [];

        $selectedChannelIds = collect();

        foreach ($guilds as $guild) {
            $guildId = $guild['guild_id'];
            $channelIds = collect(is_array($guild['channel_ids'] ?? null) ? $guild['channel_ids'] : [])
                ->map(fn ($id) => is_string($id) ? trim($id) : '')
                ->filter(fn (string $id) => preg_match('/^[0-9]{5,}$/', $id))
                ->unique()
                ->values();

            $selectedChannelIds = $selectedChannelIds->merge($channelIds);

            DiscordBackupSetting::query()->updateOrCreate(
                ['guild_id' => $guildId],
                ['channel_ids' => $channelIds->all()]
            );
        }

        $guildIds = collect($guilds)
            ->map(fn (array $guild) => $guild['guild_id'] ?? null)
            ->filter()
            ->unique()
            ->values();

        if ($guildIds->isEmpty()) {
            DiscordBackupSetting::query()->delete();
        } else {
            DiscordBackupSetting::query()
                ->whereNotIn('guild_id', $guildIds)
                ->delete();
        }

        $selectedIds = $selectedChannelIds->filter()->unique()->values();
        $allowedIds = $selectedIds->isEmpty()
            ? collect()
            : DiscordChannel::query()
                ->whereIn('id', $selectedIds)
                ->orWhereIn('parent_id', $selectedIds)
                ->pluck('id');

        $channelsToDelete = $allowedIds->isEmpty()
            ? DiscordChannel::query()->pluck('id')
            : DiscordChannel::query()->whereNotIn('id', $allowedIds)->pluck('id');

        if ($channelsToDelete->isNotEmpty()) {
            $messageIds = DiscordMessage::query()
                ->whereIn('discord_channel_id', $channelsToDelete)
                ->pluck('id');

            if ($messageIds->isNotEmpty()) {
                $paths = DiscordMessageAttachment::query()
                    ->whereIn('discord_message_id', $messageIds)
                    ->whereNotNull('storage_path')
                    ->pluck('storage_path')
                    ->filter()
                    ->unique()
                    ->all();

                if ($paths !== []) {
                    Storage::disk('local')->delete($paths);
                }
            }

            DiscordChannel::query()->whereIn('id', $channelsToDelete)->delete();
        }

        return redirect()->back();
    }
}
