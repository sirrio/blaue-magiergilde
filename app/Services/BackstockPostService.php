<?php

namespace App\Services;

use App\Support\BotRequestFailure;
use Illuminate\Support\Facades\Http;

class BackstockPostService
{
    public function post(string $channelId, ?int $operationId = null): array
    {
        $payload = [
            'channel_id' => $channelId,
        ];

        if ($operationId !== null && $operationId > 0) {
            $payload['operation_id'] = $operationId;
        }

        return $this->request('/backstock-post', $payload);
    }

    public function updateLine(int $backstockItemId): array
    {
        return $this->request('/backstock-line-update', [
            'backstock_item_id' => $backstockItemId,
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
