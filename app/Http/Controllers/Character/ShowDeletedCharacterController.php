<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Character;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ShowDeletedCharacterController extends Controller
{
    public function __invoke(Character $character): Response
    {
        abort_unless($character->trashed(), 404);
        abort_unless($character->user_id === Auth::id(), 403);

        $character->load([
            'characterClasses',
            'allies.linkedCharacter',
            'adventures' => fn ($query) => $query->withTrashed()->with('allies.linkedCharacter'),
            'downtimes' => fn ($query) => $query->withTrashed(),
        ]);

        return Inertia::render('character/show', [
            'character' => $character,
            'guildCharacters' => [],
            'readOnly' => true,
        ]);
    }
}
