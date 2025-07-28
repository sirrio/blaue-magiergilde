<?php

namespace App\Http\Controllers\RegisteredPlayer;

use App\Http\Controllers\Controller;
use App\Models\RegisteredPlayer;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredPlayerController extends Controller
{
    public function index(): Response
    {
        $players = RegisteredPlayer::query()
            ->with('registeredCharacters:id,registered_player_id,name,tier,url')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('registered-player/index', [
            'players' => $players,
        ]);
    }

    public function store(): RedirectResponse
    {
        $data = request()->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        RegisteredPlayer::create($data);

        return redirect()->back();
    }

    public function update(RegisteredPlayer $registeredPlayer): RedirectResponse
    {
        $data = request()->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $registeredPlayer->update($data);

        return redirect()->back();
    }

    public function destroy(RegisteredPlayer $registeredPlayer): RedirectResponse
    {
        $registeredPlayer->delete();

        return redirect()->back();
    }
}
