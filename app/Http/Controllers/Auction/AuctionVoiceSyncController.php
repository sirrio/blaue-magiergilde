<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\SyncAuctionVoiceRequest;
use App\Models\AuctionSetting;
use App\Support\BotRequestFailure;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class AuctionVoiceSyncController extends Controller
{
    /**
     * Sync voice channel members via the bot HTTP endpoint.
     */
    public function __invoke(SyncAuctionVoiceRequest $request): JsonResponse
    {
        $settings = AuctionSetting::current();

        if (! $settings->voice_channel_id) {
            return response()->json(['error' => 'No voice channel selected.'], 422);
        }

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            $result = BotRequestFailure::unconfigured();

            return response()->json(['error' => $result['error']], $result['status']);
        }

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/voice-sync', [
                    'channel_id' => $settings->voice_channel_id,
                ]);
        } catch (\Throwable $error) {
            $result = BotRequestFailure::fromThrowable($error);

            return response()->json(['error' => $result['error']], 502);
        }

        if (! $response->ok()) {
            $result = BotRequestFailure::fromResponse($response);

            return response()->json(['error' => $result['error']], 502);
        }

        $payload = $response->json();
        $members = is_array($payload['members'] ?? null) ? $payload['members'] : null;
        if (! is_array($members)) {
            return response()->json(['error' => 'Invalid bot response.'], 502);
        }

        return response()->json([
            'voice_channel_id' => $settings->voice_channel_id,
            'voice_candidates' => $members,
        ]);
    }
}
