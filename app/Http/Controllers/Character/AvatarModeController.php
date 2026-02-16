<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateAvatarModeRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class AvatarModeController extends Controller
{
    public function __invoke(UpdateAvatarModeRequest $request, Character $character): RedirectResponse
    {
        $character->avatar_masked = $request->boolean('avatar_masked');
        $character->save();

        return redirect()->back();
    }
}
