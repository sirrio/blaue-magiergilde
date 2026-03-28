<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Character;
use App\Support\CharacterTrackingHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class ForceDeleteDeletedCharacterController extends Controller
{
    public function __invoke(Character $character): RedirectResponse
    {
        abort_unless($character->trashed(), 404);

        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }

        $character->load([
            'adventures' => fn ($query) => $query->withTrashed(),
            'downtimes' => fn ($query) => $query->withTrashed(),
        ]);

        $history = new CharacterTrackingHistory;
        $reason = $history->permanentDeleteBlockReason($character);

        if ($reason !== null) {
            return back()->withErrors([
                'character' => $reason,
            ]);
        }

        $character->forceDelete();

        return to_route('characters.deleted');
    }
}
