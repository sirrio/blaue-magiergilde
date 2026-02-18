<?php

namespace App\Services;

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
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Bot HTTP is not configured.',
            ];
        }

        $timeout = max(120, (int) config('services.bot.http_timeout', 60));

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').$path, $payload);
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
                $responsePayload = $response->json();
                $errorDetail = is_array($responsePayload) ? ($responsePayload['error'] ?? $responsePayload['message'] ?? null) : null;
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
        ];
    }
}
