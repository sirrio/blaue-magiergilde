<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ExternalCharacterLink implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $url = trim($value);
        if ($url === '') {
            return;
        }

        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            return;
        }

        if (! $this->isDnDBeyondCharacterUrl($url)) {
            $fail('Please use a DnDBeyond character link (https://www.dndbeyond.com/characters/...).');
        }
    }

    private function isDnDBeyondCharacterUrl(string $url): bool
    {
        $host = $this->extractHost($url);
        if (! $host) {
            return false;
        }

        if (! ($host === 'dndbeyond.com' || str_ends_with($host, '.dndbeyond.com'))) {
            return false;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path)) {
            return false;
        }

        $normalizedPath = strtolower(trim($path));

        return $normalizedPath === '/characters' || str_starts_with($normalizedPath, '/characters/');
    }

    private function extractHost(string $url): ?string
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host)) {
            return null;
        }

        $normalized = strtolower(trim($host));
        if ($normalized === '') {
            return null;
        }

        return str_starts_with($normalized, 'www.')
            ? substr($normalized, 4)
            : $normalized;
    }
}
