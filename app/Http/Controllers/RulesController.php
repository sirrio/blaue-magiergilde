<?php

namespace App\Http\Controllers;

use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RulesController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 403);

        $selectedChannelIds = DiscordBackupSetting::query()
            ->pluck('channel_ids')
            ->filter()
            ->flatten()
            ->unique()
            ->values();

        $channels = $selectedChannelIds->isEmpty()
            ? collect()
            : DiscordChannel::query()
                ->whereIn('id', $selectedChannelIds)
                ->where('is_thread', false)
                ->where('type', 'GuildText')
                ->orderBy('name')
                ->get([
                    'id',
                    'guild_id',
                    'name',
                    'type',
                    'parent_id',
                    'is_thread',
                    'last_synced_at',
                ]);

        $activeChannelId = $request->string('channel')->trim()->value();
        if ($activeChannelId === '' || ! $channels->contains('id', $activeChannelId)) {
            $activeChannelId = $channels->first()?->id;
        }

        $messages = collect();
        $threads = collect();

        if ($activeChannelId) {
            $messages = $this->queryMessages($activeChannelId);

            $threadChannels = DiscordChannel::query()
                ->where('parent_id', $activeChannelId)
                ->where('is_thread', true)
                ->where('type', 'PublicThread')
                ->orderBy('name')
                ->get([
                    'id',
                    'guild_id',
                    'name',
                    'type',
                    'parent_id',
                    'is_thread',
                    'last_synced_at',
                ]);

            $threads = $threadChannels->map(fn (DiscordChannel $channel) => [
                'channel' => $channel,
                'messages' => $this->queryMessages($channel->id),
            ])->values();
        }

        return Inertia::render('rules/index', [
            'channels' => $channels,
            'activeChannelId' => $activeChannelId,
            'messages' => $messages,
            'threads' => $threads,
        ]);
    }

    private function queryMessages(string $channelId)
    {
        return DiscordMessage::query()
            ->where('discord_channel_id', $channelId)
            ->with(['attachments' => function ($query) {
                $query->orderBy('id');
            }])
            ->orderByRaw('sent_at is null, sent_at asc')
            ->orderBy('id')
            ->get([
                'id',
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
            ]);
    }
}
