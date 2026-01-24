<?php

namespace App\Services;

use App\Models\Character;
use App\Models\DiscordBotSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class CharacterApprovalNotificationService
{
    public function syncAnnouncement(Character $character): array
    {
        $character->loadMissing(['user', 'characterClasses']);

        $channelId = $character->approval_discord_channel_id;
        $messageId = $character->approval_discord_message_id;
        $status = (string) ($character->guild_status ?? 'pending');

        if ($messageId && $channelId) {
            $payload = $this->buildAnnouncementPayload($character, [
                'channel_id' => $channelId,
                'message_id' => $messageId,
            ]);

            return $this->request('/character-approval/update', $payload);
        }

        if ($status !== 'pending') {
            return [
                'ok' => true,
                'status' => 204,
            ];
        }

        $settings = DiscordBotSetting::current();
        $channelId = $settings->character_approval_channel_id;

        if (! $channelId) {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Character approval channel not configured.',
            ];
        }

        $payload = $this->buildAnnouncementPayload($character, [
            'channel_id' => $channelId,
        ]);

        $result = $this->request('/character-approval/pending', $payload);

        if ($result['ok'] && isset($result['message_id'])) {
            $character->approval_discord_channel_id = $result['channel_id'] ?? $channelId;
            $character->approval_discord_message_id = $result['message_id'];
            $character->save();
        }

        return $result;
    }

    public function notifyStatusChange(Character $character, string $status): array
    {
        $character->loadMissing('user');
        $discordId = $character->user?->discord_id;

        if (! $discordId) {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Character has no linked Discord user.',
            ];
        }

        return $this->request('/character-approval/notify', [
            'discord_user_id' => (string) $discordId,
            'status' => $status,
            'character_id' => $character->id,
            'character_name' => $character->name,
            'character_url' => route('characters.show', $character),
            'characters_url' => route('characters.index'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAnnouncementPayload(Character $character, array $overrides = []): array
    {
        $avatarUrl = null;
        if ($character->avatar) {
            $avatarUrl = Storage::disk('public')->url($character->avatar);
            if (! str_starts_with($avatarUrl, 'http://') && ! str_starts_with($avatarUrl, 'https://')) {
                $baseUrl = rtrim((string) config('app.url', ''), '/');
                if ($baseUrl !== '') {
                    $avatarUrl = $baseUrl.'/'.ltrim($avatarUrl, '/');
                }
            }
        }

        $classes = $character->characterClasses
            ->pluck('name')
            ->filter()
            ->values()
            ->all();

        return array_merge([
            'character_id' => $character->id,
            'character_name' => $character->name,
            'character_status' => $character->guild_status,
            'character_tier' => $character->start_tier,
            'character_version' => $character->version,
            'character_faction' => $character->faction,
            'character_notes' => $character->notes,
            'character_is_filler' => $character->is_filler,
            'character_dm_bubbles' => $character->dm_bubbles,
            'character_dm_coins' => $character->dm_coins,
            'character_shop_spend' => $character->bubble_shop_spend,
            'character_classes' => $classes,
            'character_avatar_url' => $avatarUrl,
            'external_link' => $character->external_link,
            'user_id' => $character->user?->id,
            'user_name' => $character->user?->name,
            'user_discord_id' => $character->user?->discord_id,
            'approval_url' => route('admin.character-approvals.index'),
            'character_url' => route('characters.show', $character),
        ], $overrides);
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

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

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
