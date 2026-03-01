<?php

namespace App\Support;

class DndBeyondCharacterLink
{
    public static function extractId(?string $url): ?int
    {
        $normalizedUrl = trim((string) $url);
        if ($normalizedUrl === '') {
            return null;
        }

        $parts = parse_url($normalizedUrl);
        if (! is_array($parts)) {
            return null;
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        if (! ($host === 'dndbeyond.com' || str_ends_with($host, '.dndbeyond.com'))) {
            return null;
        }

        $path = (string) ($parts['path'] ?? '');
        if (! preg_match('#/characters/(\d+)#', $path, $matches)) {
            return null;
        }

        return isset($matches[1]) ? (int) $matches[1] : null;
    }
}
