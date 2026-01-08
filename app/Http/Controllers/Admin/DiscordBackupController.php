<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
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
                'discord_backup' => 'Bot HTTP ist nicht konfiguriert.',
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
                'discord_backup' => 'Keine Backup-Channels ausgewaehlt.',
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
                'discord_backup' => 'Bot ist nicht erreichbar.',
            ]);
        }

        if (! $response->ok()) {
            $errorDetail = null;
            try {
                $payload = $response->json();
                $errorDetail = is_array($payload) ? ($payload['error'] ?? null) : null;
            } catch (\Throwable $error) {
                $errorDetail = null;
            }

            $fallbackDetail = trim((string) $response->body());
            $detail = $errorDetail ?: ($fallbackDetail !== '' ? $fallbackDetail : null);
            $message = 'Bot-Request fehlgeschlagen.';
            if ($detail) {
                $message .= ' '.$detail;
            }

            return redirect()->back()->withErrors([
                'discord_backup' => $message,
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
                'error' => 'Bot HTTP ist nicht konfiguriert.',
            ], 422);
        }

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup/status');
        } catch (\Throwable $error) {
            return response()->json([
                'error' => 'Bot ist nicht erreichbar.',
            ], 503);
        }

        if (! $response->ok()) {
            return response()->json([
                'error' => 'Bot-Request fehlgeschlagen.',
            ], 502);
        }

        $payload = $response->json();
        $status = $payload['status'] ?? null;
        if (! is_array($status)) {
            return response()->json([
                'error' => 'Ungueltige Bot-Antwort.',
            ], 502);
        }

        return response()->json([
            'status' => $status,
        ]);
    }
}
