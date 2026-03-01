<?php

namespace App\Services;

use App\Support\BotRequestFailure;
use Illuminate\Support\Facades\Http;

class DiscordMemberLookupService
{
    /**
     * @return array{ok: bool, status: int, name?: string, error?: string}
     */
    public function resolveGuildDisplayName(string $discordUserId): array
    {
        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));
        $sanitizedId = trim($discordUserId);

        if ($botUrl === '' || $botToken === '') {
            return BotRequestFailure::unconfigured();
        }

        if (! preg_match('/^[0-9]{5,}$/', $sanitizedId)) {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Invalid Discord ID.',
            ];
        }

        $payload = [
            'discord_user_id' => $sanitizedId,
        ];
        $guildIds = $this->parseGuildIds(config('services.bot.guild_ids'));
        if ($guildIds !== []) {
            $payload['guild_ids'] = $guildIds;
        }

        $timeout = max(120, (int) config('services.bot.http_timeout', 60));

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/discord-member-lookup', $payload);
        } catch (\Throwable $error) {
            return BotRequestFailure::fromThrowable($error);
        }

        if (! $response->ok()) {
            return BotRequestFailure::fromResponse($response);
        }

        $responseData = [];
        try {
            $responseData = $response->json();
        } catch (\Throwable $error) {
            $responseData = [];
        }

        $displayName = is_array($responseData)
            ? trim((string) ($responseData['display_name'] ?? $responseData['username'] ?? ''))
            : '';

        if ($displayName === '') {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Discord member name could not be resolved.',
            ];
        }

        return [
            'ok' => true,
            'status' => 200,
            'name' => $displayName,
        ];
    }

    /**
     * @return string[]
     */
    private function parseGuildIds(mixed $value): array
    {
        if ($value === null) {
            return [];
        }

        if (is_array($value)) {
            return collect($value)
                ->map(fn (mixed $entry): string => trim((string) $entry))
                ->filter(fn (string $entry): bool => $entry !== '')
                ->values()
                ->all();
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return [];
        }

        if (str_starts_with($raw, '[')) {
            try {
                $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
                if (is_array($decoded)) {
                    return collect($decoded)
                        ->map(fn (mixed $entry): string => trim((string) $entry))
                        ->filter(fn (string $entry): bool => $entry !== '')
                        ->values()
                        ->all();
                }
            } catch (\Throwable $error) {
                // Fall back to CSV parsing below.
            }
        }

        return collect(explode(',', $raw))
            ->map(fn (string $entry): string => trim($entry))
            ->filter(fn (string $entry): bool => $entry !== '')
            ->values()
            ->all();
    }
}
