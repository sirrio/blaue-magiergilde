<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordChannel;
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

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-backup', [
                    'app_url' => config('app.url'),
                ]);
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
}
