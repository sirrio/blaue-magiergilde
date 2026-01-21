<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateAvatarModeRequest;
use Illuminate\Http\RedirectResponse;

class AvatarModeController extends Controller
{
    public function __invoke(UpdateAvatarModeRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $user->avatar_masked = $request->boolean('avatar_masked');
        $user->save();

        return redirect()->back();
    }
}
