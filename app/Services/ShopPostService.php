<?php

namespace App\Services;

use App\Models\Shop;
use Illuminate\Support\Facades\Http;

class ShopPostService
{
    public function post(Shop $shop, string $channelId): array
    {
        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Bot HTTP is not configured.',
            ];
        }

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/shop-post', [
                    'channel_id' => $channelId,
                    'shop_id' => $shop->id,
                ]);
        } catch (\Throwable $error) {
            $detail = trim((string) $error->getMessage());
            $message = $detail === '' ? 'Bot is not reachable.' : 'Bot is not reachable. '.$detail;

            return [
                'ok' => false,
                'status' => 503,
                'error' => $message,
            ];
        }

        if (! $response->ok()) {
            $errorDetail = null;
            try {
                $payload = $response->json();
                $errorDetail = is_array($payload) ? ($payload['error'] ?? $payload['message'] ?? null) : null;
            } catch (\Throwable $error) {
                $errorDetail = null;
            }

            $fallbackDetail = trim((string) $response->body());
            $detail = $errorDetail ?: ($fallbackDetail !== '' ? $fallbackDetail : null);
            $message = sprintf('Bot request failed. (HTTP %d).', $response->status());
            if ($detail) {
                $message .= ' '.$detail;
            }

            return [
                'ok' => false,
                'status' => $response->status(),
                'error' => $message,
            ];
        }

        return [
            'ok' => true,
            'status' => 200,
            'shop_id' => $shop->id,
        ];
    }
}
