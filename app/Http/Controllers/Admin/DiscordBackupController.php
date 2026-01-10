<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use Illuminate\Http\Client\Response as HttpResponse;
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
            return redirect()->back()->withErrors([
                'discord_backup' => 'Bot HTTP is not configured.',
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

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup', [
                    'app_url' => config('app.url'),
                    'guilds' => $guildSelections,
                ]);
        } catch (\Throwable $error) {
            return redirect()->back()->withErrors([
                'discord_backup' => $this->buildBotExceptionMessage($error, 'Bot is not reachable.'),
            ]);
        }

        if (! $response->ok()) {
            return redirect()->back()->withErrors([
                'discord_backup' => $this->buildBotRequestError($response, 'Bot request failed.'),
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
            return response()->json([
                'error' => 'Bot HTTP is not configured.',
            ], 422);
        }

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup/status');
        } catch (\Throwable $error) {
            return response()->json([
                'error' => $this->buildBotExceptionMessage($error, 'Bot is not reachable.'),
            ], 503);
        }

        if (! $response->ok()) {
            return response()->json([
                'error' => $this->buildBotRequestError($response, 'Bot request failed.'),
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
        ]);
    }

    public function syncChannel(DiscordChannel $discordChannel): JsonResponse
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

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup/channel', [
                    'app_url' => config('app.url'),
                    'channel_id' => $discordChannel->id,
                    'guild_id' => $discordChannel->guild_id,
                    'guilds' => [[
                        'guild_id' => $discordChannel->guild_id,
                        'channel_ids' => [$discordChannel->id],
                    ]],
                ]);
        } catch (\Throwable $error) {
            return response()->json([
                'error' => $this->buildBotExceptionMessage($error, 'Bot is not reachable.'),
            ], 503);
        }

        if (! $response->ok()) {
            return response()->json([
                'error' => $this->buildBotRequestError($response, 'Bot request failed.'),
            ], $response->status());
        }

        return response()->json(['status' => 'started']);
    }

    private function buildBotRequestError(HttpResponse $response, string $fallback): string
    {
        $detail = null;
        $retryAfter = null;

        try {
            $payload = $response->json();
            if (is_array($payload)) {
                $detail = $payload['error'] ?? $payload['message'] ?? null;
                $retryAfter = $payload['retry_after_ms'] ?? null;
            }
        } catch (\Throwable $error) {
            $detail = null;
        }

        if (! $detail) {
            $body = trim((string) $response->body());
            $detail = $body !== '' ? $body : null;
        }

        $message = sprintf('%s (HTTP %d).', $fallback, $response->status());
        if ($detail) {
            $message .= ' '.$detail;
        }
        if ($retryAfter !== null) {
            $seconds = max(1, (int) ceil(((int) $retryAfter) / 1000));
            $message .= sprintf(' Retry after %ds.', $seconds);
        }

        return $message;
    }

    private function buildBotExceptionMessage(\Throwable $error, string $fallback): string
    {
        $detail = trim((string) $error->getMessage());
        if ($detail === '') {
            return $fallback;
        }

        return $fallback.' '.$detail;
    }
}
