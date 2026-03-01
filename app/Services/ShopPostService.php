<?php

namespace App\Services;

use App\Models\Shop;
use App\Support\BotRequestFailure;
use Illuminate\Support\Facades\Http;

class ShopPostService
{
    public function post(Shop $shop, string $channelId, ?int $operationId = null): array
    {
        $payload = [
            'channel_id' => $channelId,
            'shop_id' => $shop->id,
        ];

        if ($operationId !== null && $operationId > 0) {
            $payload['operation_id'] = $operationId;
        }

        return $this->request('/shop-post', $payload);
    }

    public function update(Shop $shop, ?int $operationId = null): array
    {
        $payload = [
            'shop_id' => $shop->id,
        ];

        if ($operationId !== null && $operationId > 0) {
            $payload['operation_id'] = $operationId;
        }

        return $this->request('/shop-update', $payload);
    }

    public function updateLine(int $shopItemId): array
    {
        return $this->request('/shop-line-update', [
            'shop_item_id' => $shopItemId,
        ]);
    }

    private function request(string $path, array $payload): array
    {
        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return BotRequestFailure::unconfigured();
        }

        $timeout = max(120, (int) config('services.bot.http_timeout', 60));

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').$path, $payload);
        } catch (\Throwable $error) {
            return BotRequestFailure::fromThrowable($error);
        }

        if (! $response->ok()) {
            return BotRequestFailure::fromResponse($response);
        }

        return [
            'ok' => true,
            'status' => 200,
        ];
    }
}
