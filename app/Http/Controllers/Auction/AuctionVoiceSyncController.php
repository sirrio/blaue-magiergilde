<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\SyncAuctionVoiceRequest;
use App\Models\AuctionSetting;
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
            return response()->json(['error' => 'Bot HTTP is not configured.'], 422);
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
            $detail = trim((string) $error->getMessage());
            $message = $detail === '' ? 'Bot is not reachable.' : 'Bot is not reachable. '.$detail;

            return response()->json(['error' => $message], 502);
        }

        if (! $response->ok()) {
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

            $message = sprintf('Bot request failed. (HTTP %d).', $response->status());
            if ($detail) {
                $message .= ' '.$detail;
            }
            if ($retryAfter !== null) {
                $seconds = max(1, (int) ceil(((int) $retryAfter) / 1000));
                $message .= sprintf(' Retry after %ds.', $seconds);
            }

            return response()->json(['error' => $message], 502);
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
