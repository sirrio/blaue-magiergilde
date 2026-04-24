<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateTrackingModeRequest;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
use Illuminate\Http\RedirectResponse;

class TrackingModeController extends Controller
{
    public function __invoke(UpdateTrackingModeRequest $request, Character $character, CharacterAuditTrail $auditTrail): RedirectResponse
    {
        $previous = (bool) $character->simplified_tracking;
        $character->simplified_tracking = $request->boolean('simplified_tracking');
        $character->save();
        $auditTrail->record($character, 'tracking_mode.updated', delta: [
            'simplified_tracking' => (int) $character->simplified_tracking - (int) $previous,
        ], metadata: [
            'before' => $previous,
            'after' => (bool) $character->simplified_tracking,
        ]);

        return redirect()->back();
    }
}
