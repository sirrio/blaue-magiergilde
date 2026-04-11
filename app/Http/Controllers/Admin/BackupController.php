<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompendiumImportRun;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordBotSetting;
use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use App\Models\LegacyCharacterApproval;
use App\Models\MundaneItemVariant;
use App\Models\Source;
use App\Support\LevelProgression;
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
        $botSettings = DiscordBotSetting::current();

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
                'character_approval_channel_id' => $botSettings->character_approval_channel_id,
                'character_approval_channel_name' => $botSettings->character_approval_channel_name,
                'character_approval_channel_guild_id' => $botSettings->character_approval_channel_guild_id,
                'support_ticket_channel_id' => $botSettings->support_ticket_channel_id,
                'support_ticket_channel_name' => $botSettings->support_ticket_channel_name,
                'support_ticket_channel_guild_id' => $botSettings->support_ticket_channel_guild_id,
            ],
            'sources' => Source::query()
                ->orderBy('shortcode')
                ->orderBy('name')
                ->get(['id', 'name', 'shortcode', 'kind']),
            'mundaneVariants' => MundaneItemVariant::query()
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'category', 'is_placeholder']),
            'compendiumImportRuns' => CompendiumImportRun::query()
                ->with('user:id,name')
                ->orderByDesc('applied_at')
                ->orderByDesc('id')
                ->limit(10)
                ->get([
                    'id',
                    'user_id',
                    'entity_type',
                    'filename',
                    'total_rows',
                    'new_rows',
                    'updated_rows',
                    'deleted_rows',
                    'unchanged_rows',
                    'invalid_rows',
                    'error_samples',
                    'applied_at',
                ]),
            'legacyCharacterApprovalStats' => [
                'total_rows' => LegacyCharacterApproval::query()->count(),
                'last_imported_at' => LegacyCharacterApproval::query()->max('updated_at'),
            ],
            'levelProgression' => collect(LevelProgression::totals())
                ->map(function (int $requiredBubbles, int $level): array {
                    return [
                        'level' => $level,
                        'required_bubbles' => $requiredBubbles,
                    ];
                })
                ->values(),
        ]);
    }
}
