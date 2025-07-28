<?php

namespace App\Http\Controllers\RegisteredPlayer;

use App\Http\Controllers\Controller;
use App\Models\RegisteredCharacter;
use App\Models\RegisteredPlayer;
use Illuminate\Http\RedirectResponse;

class RegisteredCharacterController extends Controller
{
    public function store(RegisteredPlayer $registeredPlayer): RedirectResponse
    {
        $data = request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'tier' => ['required', 'string', 'max:2'],
            'url'  => ['required', 'url'],
        ]);

        $registeredPlayer->registeredCharacters()->create($data);

        return redirect()->back();
    }

    public function update(RegisteredCharacter $registeredCharacter): RedirectResponse
    {
        $data = request()->validate([
            'name' => ['required', 'string', 'max:255'],
            'tier' => ['required', 'string', 'max:2'],
            'url'  => ['required', 'url'],
        ]);

        $registeredCharacter->update($data);

        return redirect()->back();
    }

    public function destroy(RegisteredCharacter $registeredCharacter): RedirectResponse
    {
        $registeredCharacter->delete();

        return redirect()->back();
    }
}
