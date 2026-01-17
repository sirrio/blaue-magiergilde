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

        $character->adventures()
            ->withTrashed()
            ->where('deleted_by_character', true)
            ->each(function (Adventure $adventure) {
                $adventure->restore();
                $adventure->deleted_by_character = false;
                $adventure->save();
            });
        $character->downtimes()
            ->withTrashed()
            ->where('deleted_by_character', true)
            ->each(function (Downtime $downtime) {
                $downtime->restore();
                $downtime->deleted_by_character = false;
                $downtime->save();
            });
        $character->restore();

        return to_route('characters.index');
    }
}
