<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordBotSetting;
use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use App\Models\Source;
use Inertia\Inertia;
use Inertia\Response;

class BackupController extends Controller
{
    /**
     * Display the admin settings page.
     */
    public function index(): Response
    {
        $user = request()->user();

        abort_unless($user && $user->is_admin, 403);

        return Inertia::render('admin/settings', [
            'discordBackup' => [
                'channels' => DiscordChannel::query()->count(),
                'messages' => DiscordMessage::query()->count(),
                'attachments' => DiscordMessageAttachment::query()->count(),
                'last_synced_at' => DiscordChannel::query()->max('last_synced_at'),
                'selected_channels' => DiscordBackupSetting::query()
                    ->get()
                    ->mapWithKeys(fn (DiscordBackupSetting $setting) => [
                        $setting->guild_id => $setting->channel_ids ?? [],
                    ])
                    ->toArray(),
                'selected_channels_details' => (function () {
                    $selectedIds = DiscordBackupSetting::query()
                        ->pluck('channel_ids')
                        ->filter()
                        ->flatten()
                        ->unique()
                        ->values();

                    if ($selectedIds->isEmpty()) {
                        return [];
                    }

                    return DiscordChannel::query()
                        ->whereIn('id', $selectedIds)
                        ->where('is_thread', false)
                        ->orderBy('guild_id')
                        ->orderBy('name')
                        ->get(['id', 'guild_id', 'name', 'type', 'parent_id', 'is_thread', 'last_synced_at'])
                        ->groupBy('guild_id')
                        ->map(fn ($channels) => $channels->values())
                        ->toArray();
                })(),
            ],
            'discordBotSettings' => [
                'owner_ids' => DiscordBotSetting::current()->owner_ids ?? [],
                'character_approval_channel_id' => DiscordBotSetting::current()->character_approval_channel_id,
                'character_approval_channel_name' => DiscordBotSetting::current()->character_approval_channel_name,
                'character_approval_channel_guild_id' => DiscordBotSetting::current()->character_approval_channel_guild_id,
            ],
            'sources' => Source::query()
                ->orderBy('shortcode')
                ->orderBy('name')
                ->get(['id', 'name', 'shortcode']),
        ]);
    }
}
