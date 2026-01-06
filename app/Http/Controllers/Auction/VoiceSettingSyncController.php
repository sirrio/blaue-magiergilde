<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\SyncVoiceSettingRequest;
use App\Models\VoiceSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class VoiceSettingSyncController extends Controller
{
    /**
     * Sync voice channel members via the bot HTTP endpoint.
     */
    public function __invoke(SyncVoiceSettingRequest $request): JsonResponse
    {
        $settings = VoiceSetting::current();

        if (! $settings->voice_channel_id) {
            return response()->json(['error' => 'Keine Voice Channel ID gesetzt.'], 422);
        }

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return response()->json(['error' => 'Bot HTTP ist nicht konfiguriert.'], 422);
        }

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/voice-sync', [
                    'channel_id' => $settings->voice_channel_id,
                ]);
        } catch (\Throwable $error) {
            return response()->json(['error' => 'Bot ist nicht erreichbar.'], 502);
        }

        if (! $response->ok()) {
            return response()->json(['error' => 'Bot-Request fehlgeschlagen.'], 502);
        }

        $payload = $response->json();
        $members = is_array($payload['members'] ?? null) ? $payload['members'] : null;
        $updatedAt = is_string($payload['updated_at'] ?? null) ? $payload['updated_at'] : null;

        if (! is_array($members)) {
            return response()->json(['error' => 'Ungueltige Bot-Antwort.'], 502);
        }

        return response()->json([
            'voice_channel_id' => $settings->voice_channel_id,
            'voice_candidates' => $members,
            'voice_updated_at' => $updatedAt ?: now()->toISOString(),
        ]);
    }
}
