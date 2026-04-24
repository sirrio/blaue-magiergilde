<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\SubmitCharacterForApprovalRequest;
use App\Models\Character;
use App\Services\CharacterApprovalNotificationService;
use App\Support\CharacterAuditTrail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class SubmitCharacterForApprovalController extends Controller
{
    public function __invoke(
        SubmitCharacterForApprovalRequest $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
        CharacterAuditTrail $auditTrail,
    ): RedirectResponse {
        if (! (bool) Config::get('features.character_status_switch', true)) {
            return redirect()->back()->withErrors([
                'guild_status' => 'Character submission is currently disabled.',
            ]);
        }

        if (! in_array($character->guild_status, ['draft', 'needs_changes'], true)) {
            return redirect()->back();
        }

        $previousStatus = $character->guild_status;
        $registrationNote = trim((string) $request->input('registration_note', ''));
        $character->registration_note = $registrationNote !== '' ? $registrationNote : null;
        $character->review_note = null;
        $character->guild_status = 'pending';
        $character->save();
        $auditTrail->record($character, 'character.submitted', metadata: [
            'previous_status' => $previousStatus,
            'new_status' => 'pending',
            'has_registration_note' => $character->registration_note !== null,
        ]);

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
