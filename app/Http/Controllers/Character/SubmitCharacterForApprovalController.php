<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Character;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class SubmitCharacterForApprovalController extends Controller
{
    public function __invoke(
        Request $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
        $userId = $request->user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }

        if (! (bool) Config::get('features.character_status_switch', true)) {
            return redirect()->back()->withErrors([
                'guild_status' => 'Character submission is currently disabled.',
            ]);
        }

        if ($character->guild_status !== 'draft') {
            return redirect()->back();
        }

        $character->guild_status = 'pending';
        $character->save();

        $result = $notificationService->syncAnnouncement($character);
        if (! $result['ok']) {
            Log::warning('Character approval channel notification failed.', [
                'character_id' => $character->id,
                'error' => $result['error'] ?? null,
            ]);
        }

        return redirect()->back();
    }
}
