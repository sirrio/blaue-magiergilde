<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\PostAuctionRequest;
use App\Models\Auction;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class AuctionPostController extends Controller
{
    public function __invoke(PostAuctionRequest $request, Auction $auction): JsonResponse
    {
        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return response()->json([
                'error' => 'Bot HTTP is not configured.',
            ], 422);
        }

        $channelId = $request->validated()['channel_id'];

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/auction-post', [
                    'channel_id' => $channelId,
                    'auction_id' => $auction->id,
                ]);
        } catch (\Throwable $error) {
            return response()->json([
                'error' => 'Bot is not reachable.',
            ], 503);
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
            $message = 'Bot request failed.';
            if ($detail) {
                $message .= ' '.$detail;
            }

            return response()->json([
                'error' => $message,
            ], $response->status());
        }

        return response()->json([
            'status' => 'posted',
            'auction_id' => $auction->id,
        ]);
    }
}
