<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class RestoreDeletedCharacterController extends Controller
{
    public function __invoke(Character $character): RedirectResponse
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }

        $character->adventures()->withTrashed()->each(function (Adventure $adventure) {
            $adventure->restore();
        });
        $character->downtimes()->withTrashed()->each(function (Downtime $downtime) {
            $downtime->restore();
        });
        $character->restore();

        return to_route('characters.index');
    }
}
