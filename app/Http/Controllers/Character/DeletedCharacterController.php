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
        $user = Auth::user();
        $characters = Character::onlyTrashed()
            ->with([
                'adventures' => fn ($q) => $q->withTrashed(),
                'downtimes' => fn ($q) => $q->withTrashed(),
                'characterClasses',
            ])
            ->where('user_id', Auth::id())
            ->orderBy('deleted_at', 'desc')
            ->get();

        $characters->each(function (Character $character) use ($user): void {
            $character->setAttribute('use_simplified_tracking', (bool) $user?->simplified_tracking);
        });

        return Inertia::render('character/deleted', [
            'characters' => $characters,
        ]);
    }
}
