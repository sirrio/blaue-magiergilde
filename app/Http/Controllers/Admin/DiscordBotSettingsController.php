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
        $raw = (string) ($request->validated()['owner_ids'] ?? '');

        $ownerIds = collect(explode(',', $raw))
            ->map(fn ($id) => trim($id))
            ->filter(fn (string $id) => preg_match('/^[0-9]{5,}$/', $id))
            ->values()
            ->all();

        DiscordBotSetting::current()->update([
            'owner_ids' => $ownerIds,
        ]);

        return redirect()->back();
    }
}
