<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Character;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DeletedCharacterController extends Controller
{
    public function __invoke(): Response
    {
        $simplifiedTracking = Auth::user()?->simplified_tracking ?? false;
        $characters = Character::onlyTrashed()
            ->with([
                'adventures' => fn ($q) => $q->withTrashed(),
                'downtimes' => fn ($q) => $q->withTrashed(),
                'characterClasses',
            ])
            ->where('user_id', Auth::id())
            ->orderBy('deleted_at', 'desc')
            ->get();
        $characters->each(function (Character $character) use ($simplifiedTracking): void {
            $character->setAttribute('simplified_tracking', $simplifiedTracking);
        });

        return Inertia::render('character/deleted', [
            'characters' => $characters,
        ]);
    }
}
