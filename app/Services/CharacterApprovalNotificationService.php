<?php

namespace App\Services;

use App\Models\Character;
use App\Models\DiscordBotSetting;
use Illuminate\Support\Facades\Http;

class CharacterApprovalNotificationService
{
    public function announcePending(Character $character): array
    {
        $settings = DiscordBotSetting::current();
        $channelId = $settings->character_approval_channel_id;

        if (! $channelId) {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Character approval channel not configured.',
            ];
        }

        $character->loadMissing('user');

        return $this->request('/character-approval/pending', [
            'channel_id' => $channelId,
            'character_id' => $character->id,
            'character_name' => $character->name,
            'character_tier' => $character->start_tier,
            'user_id' => $character->user?->id,
            'user_name' => $character->user?->name,
            'user_discord_id' => $character->user?->discord_id,
            'approval_url' => route('admin.character-approvals.index'),
            'character_url' => route('characters.show', $character),
        ]);
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

        return [
            'ok' => true,
            'status' => 200,
        ];
    }
}
