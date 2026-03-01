<?php

namespace App\Services;

use App\Exceptions\FrontendErrorReportedException;
use Illuminate\Http\Request;

class FrontendErrorReporter
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function ingest(array $payload, Request $request): bool
    {
        if ($this->shouldIgnore($payload)) {
            return false;
        }

        report(new FrontendErrorReportedException(
            $this->formatMessage($payload),
            $this->buildContext($payload, $request),
        ));

        return true;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function shouldIgnore(array $payload): bool
    {
        $message = mb_strtolower(trim((string) ($payload['message'] ?? '')));
        $stack = mb_strtolower((string) ($payload['stack'] ?? ''));

        if ($message === '' || $message === 'script error' || $message === 'script error.') {
            return true;
        }

        foreach ([
            'resizeobserver loop limit exceeded',
            'resizeobserver loop completed with undelivered notifications',
            'the operation was aborted',
            'aborterror',
        ] as $needle) {
            if (str_contains($message, $needle) || str_contains($stack, $needle)) {
                return true;
            }
        }

        foreach ([
            'chrome-extension://',
            'moz-extension://',
            'safari-extension://',
        ] as $needle) {
            if (str_contains($stack, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function buildContext(array $payload, Request $request): array
    {
        $user = $request->user();

        return array_filter([
            'source' => $payload['source'] ?? null,
            'component' => $payload['component'] ?? null,
            'url' => $payload['url'] ?? null,
            'file' => $payload['file'] ?? null,
            'line' => $payload['line'] ?? null,
            'column' => $payload['column'] ?? null,
            'stack' => $payload['stack'] ?? null,
            'context' => $payload['context'] ?? null,
            'request_referrer' => $request->headers->get('referer'),
            'request_user_agent' => $request->userAgent(),
            'request_ip' => $request->ip(),
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'user_name' => $user?->name,
        ], static fn (mixed $value): bool => ! in_array($value, [null, '', []], true));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function formatMessage(array $payload): string
    {
        $source = (string) ($payload['source'] ?? 'unknown');
        $message = trim((string) ($payload['message'] ?? 'Unknown frontend error'));
        $component = trim((string) ($payload['component'] ?? ''));

        if ($component !== '') {
            return sprintf('[frontend][%s][%s] %s', $source, $component, $message);
        }

        return sprintf('[frontend][%s] %s', $source, $message);
    }
}
