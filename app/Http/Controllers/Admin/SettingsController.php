<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use App\Models\VoiceSetting;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Display the admin settings page.
     */
    public function index(): Response
    {
        $user = request()->user();

        abort_unless($user && $user->is_admin, 403);

        return Inertia::render('admin/settings', [
            'voiceSettings' => VoiceSetting::current(),
            'discordBackup' => [
                'channels' => DiscordChannel::query()->count(),
                'messages' => DiscordMessage::query()->count(),
                'attachments' => DiscordMessageAttachment::query()->count(),
                'last_synced_at' => DiscordChannel::query()->max('last_synced_at'),
            ],
        ]);
    }
}
