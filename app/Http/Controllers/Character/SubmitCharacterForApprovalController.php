<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\SubmitCharacterForApprovalRequest;
use App\Models\Character;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class SubmitCharacterForApprovalController extends Controller
{
    public function __invoke(
        SubmitCharacterForApprovalRequest $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
        if (! (bool) Config::get('features.character_status_switch', true)) {
            return redirect()->back()->withErrors([
                'guild_status' => 'Character submission is currently disabled.',
            ]);
        }

        if (! in_array($character->guild_status, ['draft', 'needs_changes'], true)) {
            return redirect()->back();
        }

        $character->registration_note = trim($request->string('registration_note')->toString());
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
