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
        $characters = Character::onlyTrashed()
            ->where('user_id', Auth::id())
            ->orderBy('deleted_at', 'desc')
            ->get();

        return Inertia::render('character/deleted', [
            'characters' => $characters,
        ]);
    }
}
