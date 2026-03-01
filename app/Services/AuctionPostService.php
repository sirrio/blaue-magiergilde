<?php

namespace App\Services;

use App\Support\BotRequestFailure;
use Illuminate\Support\Facades\Http;

class AuctionPostService
{
    public function post(int $auctionId, string $channelId, ?int $operationId = null): array
    {
        $payload = [
            'channel_id' => $channelId,
            'auction_id' => $auctionId,
        ];

        if ($operationId !== null && $operationId > 0) {
            $payload['operation_id'] = $operationId;
        }

        return $this->request('/auction-post', $payload);
    }

    public function updateLine(int $auctionItemId): array
    {
        return $this->request('/auction-line-update', [
            'auction_item_id' => $auctionItemId,
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
