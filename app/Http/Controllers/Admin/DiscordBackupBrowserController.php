<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DiscordBackupBrowserController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $selected = DiscordBackupSetting::query()
            ->get()
            ->mapWithKeys(fn (DiscordBackupSetting $setting) => [
                $setting->guild_id => $setting->channel_ids ?? [],
            ])
            ->toArray();

        $selectedIds = collect($selected)->flatten()->filter()->unique();

        $channels = DiscordChannel::query()
            ->withCount('messages')
            ->when($selectedIds->isNotEmpty(), function ($query) use ($selectedIds) {
                $query->whereIn('id', $selectedIds)
                    ->orWhereIn('parent_id', $selectedIds);
            })
            ->orderBy('guild_id')
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

        return Inertia::render('admin/discord-backup/index', [
            'channels' => $channels,
            'selected' => $selected,
        ]);
    }

    public function show(Request $request, DiscordChannel $discordChannel): Response
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $selectedIds = DiscordBackupSetting::query()
            ->pluck('channel_ids')
            ->filter()
            ->flatten()
            ->unique();

        $isAllowed = $selectedIds->contains($discordChannel->id)
            || ($discordChannel->parent_id && $selectedIds->contains($discordChannel->parent_id));

        abort_unless($isAllowed, 404);

        $messages = DiscordMessage::query()
            ->where('discord_channel_id', $discordChannel->id)
            ->with(['attachments' => function ($query) {
                $query->orderBy('id');
            }])
            ->orderByDesc('sent_at')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('admin/discord-backup/show', [
            'channel' => $discordChannel,
            'messages' => $messages,
        ]);
    }

    public function download(Request $request, DiscordMessageAttachment $discordMessageAttachment): RedirectResponse|\Symfony\Component\HttpFoundation\StreamedResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $message = $discordMessageAttachment->message;
        if (! $message) {
            return redirect()->back();
        }

        $selectedIds = DiscordBackupSetting::query()
            ->pluck('channel_ids')
            ->filter()
            ->flatten()
            ->unique();

        $parentId = $message->channel?->parent_id;
        $isAllowed = $selectedIds->contains($message->discord_channel_id)
            || ($parentId && $selectedIds->contains($parentId));

        if (! $isAllowed) {
            return redirect()->back();
        }

        $path = $discordMessageAttachment->storage_path;
        if (! $path || ! Storage::disk('local')->exists($path)) {
            return redirect()->back();
        }

        return Storage::disk('local')->download($path, $discordMessageAttachment->filename);
    }
}
