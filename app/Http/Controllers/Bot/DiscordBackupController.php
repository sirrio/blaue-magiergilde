<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bot\StoreDiscordAttachmentRequest;
use App\Http\Requests\Bot\StoreDiscordChannelsRequest;
use App\Http\Requests\Bot\StoreDiscordMessagesRequest;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DiscordBackupController extends Controller
{
    public function channels(Request $request): JsonResponse
    {
        $this->ensureBotToken($request);

        $guildId = $request->string('guild_id')->trim();

        $query = DiscordChannel::query()->select(['id', 'guild_id', 'last_message_id']);
        if ($guildId->isNotEmpty()) {
            $query->where('guild_id', $guildId);
        }

        return response()->json([
            'channels' => $query->orderBy('id')->get(),
        ]);
    }

    public function storeChannels(StoreDiscordChannelsRequest $request): JsonResponse
    {
        $this->ensureBotToken($request);

        $channels = $request->validated()['channels'];
        $allowedChannelIds = $this->allowedChannelIds();

        if ($allowedChannelIds->isEmpty()) {
            return response()->json(['stored' => 0]);
        }

        foreach ($channels as $channel) {
            $parentId = $channel['parent_id'] ?? null;
            $isAllowed = $allowedChannelIds->contains($channel['id'])
                || ($parentId && $allowedChannelIds->contains($parentId));

            if (! $isAllowed) {
                continue;
            }

            $payload = [
                'guild_id' => $channel['guild_id'],
                'name' => $channel['name'],
                'type' => $channel['type'],
                'parent_id' => $channel['parent_id'] ?? null,
                'is_thread' => (bool) ($channel['is_thread'] ?? false),
            ];

            if (! empty($channel['last_message_id'])) {
                $payload['last_message_id'] = $channel['last_message_id'];
            }

            DiscordChannel::query()->updateOrCreate(['id' => $channel['id']], $payload);
        }

        return response()->json(['stored' => count($channels)]);
    }

    public function storeMessages(StoreDiscordMessagesRequest $request): JsonResponse
    {
        $this->ensureBotToken($request);

        $data = $request->validated();
        $channelId = $data['channel_id'];
        $guildId = $data['guild_id'];
        $messages = $data['messages'] ?? [];
        $allowedChannelIds = $this->allowedChannelIds();

        if ($allowedChannelIds->isEmpty()) {
            return response()->json(['stored' => 0]);
        }

        $existingChannel = DiscordChannel::query()->find($channelId);
        $parentId = $existingChannel?->parent_id;
        $isAllowed = $allowedChannelIds->contains($channelId)
            || ($parentId && $allowedChannelIds->contains($parentId));

        if (! $isAllowed) {
            return response()->json(['stored' => 0]);
        }

        $channel = DiscordChannel::query()->firstOrCreate(
            ['id' => $channelId],
            [
                'guild_id' => $guildId,
                'name' => $channelId,
                'type' => 'unknown',
            ]
        );

        if ($messages === []) {
            $channel->last_synced_at = now();
            $channel->save();

            return response()->json(['stored' => 0]);
        }

        $now = now();
        $rows = [];
        $maxMessageId = null;

        foreach ($messages as $message) {
            $sentAt = isset($message['sent_at']) ? Carbon::parse($message['sent_at']) : null;
            $editedAt = isset($message['edited_at']) ? Carbon::parse($message['edited_at']) : null;
            $payload = $message['payload'] ?? null;
            $payloadJson = null;
            if ($payload !== null) {
                try {
                    $payloadJson = json_encode($payload, JSON_THROW_ON_ERROR);
                } catch (\Throwable $error) {
                    $payloadJson = null;
                }
            }

            $rows[] = [
                'id' => $message['id'],
                'discord_channel_id' => $channelId,
                'guild_id' => $guildId,
                'author_id' => $message['author_id'],
                'author_name' => $message['author_name'],
                'author_display_name' => $message['author_display_name'] ?? null,
                'content' => $message['content'] ?? null,
                'message_type' => (int) ($message['message_type'] ?? 0),
                'is_pinned' => (bool) ($message['is_pinned'] ?? false),
                'sent_at' => $sentAt?->toDateTimeString(),
                'edited_at' => $editedAt?->toDateTimeString(),
                'payload' => $payloadJson,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $maxMessageId = $this->maxSnowflake($maxMessageId, $message['id']);
        }

        DiscordMessage::query()->upsert(
            $rows,
            ['id'],
            [
                'discord_channel_id',
                'guild_id',
                'author_id',
                'author_name',
                'author_display_name',
                'content',
                'message_type',
                'is_pinned',
                'sent_at',
                'edited_at',
                'payload',
                'updated_at',
            ]
        );

        foreach ($messages as $message) {
            $attachments = $message['attachments'] ?? [];
            if (! is_array($attachments)) {
                continue;
            }

            foreach ($attachments as $attachment) {
                DiscordMessageAttachment::query()->updateOrCreate(
                    [
                        'discord_message_id' => $message['id'],
                        'attachment_id' => $attachment['id'],
                    ],
                    [
                        'filename' => $attachment['filename'],
                        'content_type' => $attachment['content_type'] ?? null,
                        'size' => $attachment['size'] ?? null,
                        'url' => $attachment['url'],
                    ]
                );
            }
        }

        if ($maxMessageId !== null) {
            $currentLast = $channel->last_message_id;
            if ($currentLast === null || $this->compareSnowflakes($maxMessageId, $currentLast) > 0) {
                $channel->last_message_id = $maxMessageId;
            }
        }

        $channel->last_synced_at = now();
        $channel->save();

        return response()->json(['stored' => count($rows)]);
    }

    public function storeAttachment(StoreDiscordAttachmentRequest $request): JsonResponse
    {
        $this->ensureBotToken($request);

        $data = $request->validated();

        $message = DiscordMessage::query()->find($data['discord_message_id']);
        if (! $message) {
            return response()->json(['error' => 'Message not found.'], 404);
        }

        $allowedChannelIds = $this->allowedChannelIds();
        $parentId = $message->channel?->parent_id;
        $isAllowed = $allowedChannelIds->contains($message->discord_channel_id)
            || ($parentId && $allowedChannelIds->contains($parentId));

        if (! $isAllowed) {
            return response()->json(['error' => 'Channel not allowed.'], 403);
        }

        $file = $request->file('file');
        if (! $file) {
            return response()->json(['error' => 'Attachment missing.'], 422);
        }

        $safeFilename = $this->buildFilename($data['attachment_id'], $data['filename']);
        $directory = sprintf(
            'discord-backups/%s/%s/%s',
            $message->guild_id,
            $message->discord_channel_id,
            $message->id
        );
        $storagePath = $file->storeAs($directory, $safeFilename, 'local');

        DiscordMessageAttachment::query()->updateOrCreate(
            [
                'discord_message_id' => $message->id,
                'attachment_id' => $data['attachment_id'],
            ],
            [
                'filename' => $data['filename'],
                'content_type' => $data['content_type'] ?? $file->getClientMimeType(),
                'size' => $data['size'] ?? $file->getSize(),
                'url' => $data['url'],
                'storage_path' => $storagePath,
            ]
        );

        return response()->json([
            'stored' => true,
            'storage_path' => $storagePath,
        ]);
    }

    private function ensureBotToken(Request $request): void
    {
        $token = trim((string) config('services.bot.http_token', ''));
        if ($token === '') {
            abort(500, 'Bot token missing.');
        }

        $provided = (string) $request->header('X-Bot-Token', '');
        abort_unless($provided !== '' && hash_equals($token, $provided), 401);
    }

    private function maxSnowflake(?string $current, string $candidate): string
    {
        if ($current === null) {
            return $candidate;
        }

        return $this->compareSnowflakes($candidate, $current) > 0 ? $candidate : $current;
    }

    private function compareSnowflakes(string $left, string $right): int
    {
        $leftLength = strlen($left);
        $rightLength = strlen($right);

        if ($leftLength !== $rightLength) {
            return $leftLength <=> $rightLength;
        }

        return $left <=> $right;
    }

    private function buildFilename(string $attachmentId, string $filename): string
    {
        $baseName = pathinfo($filename, PATHINFO_FILENAME);
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $safeBase = Str::slug($baseName);

        if ($safeBase === '') {
            $safeBase = $attachmentId;
        }

        $safeName = $attachmentId.'_'.$safeBase;
        if ($extension !== '') {
            $safeName .= '.'.$extension;
        }

        return $safeName;
    }

    private function allowedChannelIds()
    {
        return DiscordBackupSetting::query()
            ->pluck('channel_ids')
            ->filter()
            ->flatten()
            ->unique()
            ->values();
    }
}
