<?php

namespace App\Services;

use App\Support\BotRequestFailure;
use Illuminate\Support\Facades\Http;

class DiscordLinePostService
{
    /**
     * @param  list<string>  $lines
     * @return array{ok: bool, status: int, posted_lines?: int, error?: string, timed_out?: bool, retry_after_seconds?: int|null}
     */
    public function post(string $channelId, array $lines): array
    {
        return $this->request('/discord-line-post', [
            'channel_id' => $channelId,
            'lines' => $lines,
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
            'posted_lines' => (int) ($response->json('posted_lines') ?? count($lines)),
        ];
    }
}
