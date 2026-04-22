<?php

namespace App\Services;

use App\Models\Adventure;
use App\Models\Character;
use App\Models\DiscordBotSetting;
use App\Support\BotRequestFailure;
use App\Support\CharacterProgressionState;
use Illuminate\Support\Facades\Http;

class CharacterRetirementNotificationService
{
    public function __construct(private readonly CharacterProgressionState $progressionState = new CharacterProgressionState) {}

    /**
     * @param  array{previous_status?: string|null}  $context
     * @return array<string, mixed>
     */
    public function notifyRetirement(Character $character, array $context = []): array
    {
        $character->loadMissing(['user', 'characterClasses', 'adventures']);

        $settings = DiscordBotSetting::current();
        $channelId = trim((string) ($settings->character_retirement_channel_id ?? ''));
        $currentLevel = $this->progressionState->currentLevel($character);

        if ($channelId === '') {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Character retirement channel not configured.',
            ];
        }

        return $this->request('/character-retirement/post', [
            'channel_id' => $channelId,
            'character_id' => $character->id,
            'character_name' => $character->name,
            'character_status' => $character->guild_status,
            'previous_status' => isset($context['previous_status']) ? trim((string) $context['previous_status']) : null,
            'character_level' => $currentLevel,
            'character_tier' => $this->tierForLevel($currentLevel),
            'character_version' => $character->version,
            'character_faction' => $character->faction,
            'character_played_adventures' => $this->playedAdventureCount($character),
            'character_classes' => $character->characterClasses->pluck('name')->filter()->values()->all(),
            'character_avatar_url' => $this->buildAvatarUrl($character),
            'character_notes' => $character->notes,
            'external_link' => $this->sanitizeExternalLink($character->external_link),
            'user_id' => $character->user?->id,
            'user_name' => $character->user?->name,
            'user_discord_id' => $character->user?->discord_id,
        ]);
    }

    private function buildAvatarUrl(Character $character): ?string
    {
        if (! $character->avatar) {
            return null;
        }

        $avatarValue = trim((string) $character->avatar);
        if ($avatarValue === '') {
            return null;
        }

        if (str_starts_with($avatarValue, 'http://') || str_starts_with($avatarValue, 'https://')) {
            return $avatarValue;
        }

        $baseUrl = rtrim((string) config('services.bot.public_url', ''), '/');
        if ($baseUrl === '') {
            $baseUrl = rtrim((string) config('app.url', ''), '/');
        }

        if ($baseUrl === '') {
            return null;
        }

        $path = ltrim($avatarValue, '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        if ($character->avatar_masked ?? true) {
            return $baseUrl.'/avatars/masked?path='.urlencode($path);
        }

        return $baseUrl.'/storage/'.$path;
    }

    private function sanitizeExternalLink(?string $value): ?string
    {
        $url = trim((string) $value);

        return $url !== '' && filter_var($url, FILTER_VALIDATE_URL) ? $url : null;
    }

    private function playedAdventureCount(Character $character): int
    {
        if ($this->progressionState->usesManualLevelTracking($character) && $character->manual_adventures_count !== null) {
            return max(0, (int) $character->manual_adventures_count);
        }

        return $character->adventures
            ->filter(fn (Adventure $adventure): bool => ! $adventure->trashed() && ! (bool) $adventure->is_pseudo)
            ->count();
    }

    private function tierForLevel(int $level): string
    {
        return match (true) {
            $level >= 17 => 'ET',
            $level >= 11 => 'HT',
            $level >= 5 => 'LT',
            default => 'BT',
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function request(string $path, array $payload): array
    {
        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return BotRequestFailure::unconfigured();
        }

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

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

        $responseData = [];

        try {
            $responseData = $response->json();
        } catch (\Throwable $error) {
            $responseData = [];
        }

        return array_merge([
            'ok' => true,
            'status' => 200,
        ], is_array($responseData) ? $responseData : []);
    }
}
