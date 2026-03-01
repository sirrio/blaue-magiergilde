<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use App\Support\BotRequestFailure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class DiscordBackupController extends Controller
{
    public function store(): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            $result = BotRequestFailure::unconfigured();

            return redirect()->back()->withErrors([
                'discord_backup' => $result['error'],
            ]);
        }

        $guildSelections = DiscordBackupSetting::query()
            ->get()
            ->map(fn (DiscordBackupSetting $setting) => [
                'guild_id' => $setting->guild_id,
                'channel_ids' => $setting->channel_ids ?? [],
            ])
            ->filter(fn (array $selection) => ! empty($selection['channel_ids']))
            ->values()
            ->all();

        if ($guildSelections === []) {
            return redirect()->back()->withErrors([
                'discord_backup' => 'No backup channels selected.',
            ]);
        }

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

        $appUrl = trim((string) config('services.bot.app_url', '')) ?: config('app.url');

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup', [
                    'app_url' => $appUrl,
                    'guilds' => $guildSelections,
                ]);
        } catch (\Throwable $error) {
            $result = BotRequestFailure::fromThrowable($error);

            return redirect()->back()->withErrors([
                'discord_backup' => $result['error'],
            ]);
        }

        if (! $response->ok()) {
            $result = BotRequestFailure::fromResponse($response);

            return redirect()->back()->withErrors([
                'discord_backup' => $result['error'],
            ]);
        }

        return redirect()->back();
    }

    public function destroy(): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        DB::transaction(function (): void {
            DiscordChannel::query()->delete();
        });

        Storage::disk('local')->deleteDirectory('discord-backups');

        return redirect()->back();
    }

    public function status(): JsonResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            $result = BotRequestFailure::unconfigured();

            return response()->json([
                'configured' => false,
                'status' => null,
                'error' => $result['error'],
            ]);
        }

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup/status');
        } catch (\Throwable $error) {
            $result = BotRequestFailure::fromThrowable($error);

            return response()->json([
                'error' => $result['error'],
            ], 503);
        }

        if (! $response->ok()) {
            $result = BotRequestFailure::fromResponse($response);

            return response()->json([
                'error' => $result['error'],
            ], 502);
        }

        $payload = $response->json();
        $status = $payload['status'] ?? null;
        if (! is_array($status)) {
            return response()->json([
                'error' => 'Invalid bot response.',
            ], 502);
        }

        return response()->json([
            'status' => $status,
            'configured' => true,
        ]);
    }

    public function syncChannel(DiscordChannel $discordChannel): JsonResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            $result = BotRequestFailure::unconfigured();

            return response()->json([
                'error' => $result['error'],
            ], $result['status']);
        }

        if ($discordChannel->is_thread) {
            return response()->json([
                'error' => 'Threads cannot be synced directly.',
            ], 422);
        }

        $allowedIds = DiscordBackupSetting::query()
            ->pluck('channel_ids')
            ->filter()
            ->flatten()
            ->unique()
            ->values();

        if (! $allowedIds->contains($discordChannel->id)) {
            return response()->json([
                'error' => 'Channel is not selected.',
            ], 403);
        }

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

        $appUrl = trim((string) config('services.bot.app_url', '')) ?: config('app.url');

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup/channel', [
                    'app_url' => $appUrl,
                    'channel_id' => $discordChannel->id,
                    'guild_id' => $discordChannel->guild_id,
                    'guilds' => [[
                        'guild_id' => $discordChannel->guild_id,
                        'channel_ids' => [$discordChannel->id],
                    ]],
                ]);
        } catch (\Throwable $error) {
            $result = BotRequestFailure::fromThrowable($error);

            return response()->json([
                'error' => $result['error'],
            ], 503);
        }

        if (! $response->ok()) {
            $result = BotRequestFailure::fromResponse($response);

            return response()->json([
                'error' => $result['error'],
            ], $response->status());
        }

        return response()->json(['status' => 'started']);
    }
}
