<?php

namespace App\Support;

use Illuminate\Http\Client\Response as HttpResponse;

class BotRequestFailure
{
    /**
     * @return array{ok: false, status: int, error: string, timed_out: bool, retry_after_seconds?: int|null}
     */
    public static function unconfigured(): array
    {
        return [
            'ok' => false,
            'status' => 422,
            'error' => 'Bot HTTP is not configured.',
            'timed_out' => false,
            'retry_after_seconds' => null,
        ];
    }

    /**
     * @return array{ok: false, status: int, error: string, timed_out: bool, retry_after_seconds?: int|null}
     */
    public static function fromThrowable(\Throwable $error, string $fallback = 'Bot is not reachable.'): array
    {
        $detail = trim((string) $error->getMessage());
        $timedOut = self::isTimeoutDetail($detail);

        if ($timedOut) {
            $message = $fallback.' The bot did not respond in time. It may still finish in the background. Wait a moment, check Discord, then retry if needed.';
        } else {
            $message = $detail === ''
                ? $fallback.' Check that the bot is running, then try again.'
                : $fallback.' '.$detail.' Check that the bot is running, then try again.';
        }

        return [
            'ok' => false,
            'status' => 503,
            'error' => $message,
            'timed_out' => $timedOut,
            'retry_after_seconds' => null,
        ];
    }

    /**
     * @return array{ok: false, status: int, error: string, timed_out: bool, retry_after_seconds?: int|null}
     */
    public static function fromResponse(HttpResponse $response, string $fallback = 'Bot request failed.'): array
    {
        $detail = null;
        $retryAfterSeconds = null;

        try {
            $payload = $response->json();
            if (is_array($payload)) {
                $detail = $payload['error'] ?? $payload['message'] ?? null;
                $retryAfterMs = $payload['retry_after_ms'] ?? null;
                if ($retryAfterMs !== null) {
                    $retryAfterSeconds = max(1, (int) ceil(((int) $retryAfterMs) / 1000));
                }
            }
        } catch (\Throwable $error) {
            $detail = null;
        }

        if (! $detail) {
            $body = trim((string) $response->body());
            $detail = $body !== '' ? $body : null;
        }

        $timedOut = self::isTimeoutDetail((string) $detail) || in_array($response->status(), [408, 504], true);
        $message = sprintf('%s (HTTP %d).', $fallback, $response->status());

        if ($detail) {
            $message .= ' '.$detail;
        }

        if ($timedOut) {
            $message .= ' The bot may still finish in the background. Wait a moment, check Discord, then retry if needed.';
        } elseif ($retryAfterSeconds !== null) {
            $message .= sprintf(' Retry after %ds.', $retryAfterSeconds);
        } elseif ($response->status() >= 500) {
            $message .= ' Wait a moment, then try again.';
        }

        return [
            'ok' => false,
            'status' => $response->status(),
            'error' => $message,
            'timed_out' => $timedOut,
            'retry_after_seconds' => $retryAfterSeconds,
        ];
    }

    public static function isTimeoutDetail(?string $detail): bool
    {
        $normalizedDetail = strtolower(trim((string) $detail));

        return $normalizedDetail !== ''
            && (
                str_contains($normalizedDetail, 'curl error 28')
                || str_contains($normalizedDetail, 'operation timed out')
                || str_contains($normalizedDetail, 'timed out')
            );
    }
}
