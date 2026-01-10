<?php

namespace App\Http\Controllers;

use App\Models\DiscordBackupSetting;
use App\Models\DiscordMessageAttachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HandbookAttachmentController extends Controller
{
    public function __invoke(Request $request, DiscordMessageAttachment $discordMessageAttachment): RedirectResponse|StreamedResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

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

        abort_unless($isAllowed, 404);

        $path = $discordMessageAttachment->storage_path;
        if (! $path || ! Storage::disk('local')->exists($path)) {
            return redirect()->back();
        }

        return Storage::disk('local')->download($path, $discordMessageAttachment->filename);
    }
}
