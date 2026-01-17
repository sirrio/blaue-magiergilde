<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Character;
use Illuminate\Support\Facades\Auth;

class PermanentDeleteCharacterController extends Controller
{
    public function __invoke(Character $character): \Illuminate\Http\RedirectResponse
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }

        $character->adventures()->withTrashed()->forceDelete();
        $character->downtimes()->withTrashed()->forceDelete();
        $character->forceDelete();

        return redirect()->back();
    }
}
