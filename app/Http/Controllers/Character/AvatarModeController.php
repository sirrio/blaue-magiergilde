<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateAvatarModeRequest;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
use Illuminate\Http\RedirectResponse;

class AvatarModeController extends Controller
{
    public function __invoke(UpdateAvatarModeRequest $request, Character $character, CharacterAuditTrail $auditTrail): RedirectResponse
    {
        $previous = (bool) $character->avatar_masked;
        $character->avatar_masked = $request->boolean('avatar_masked');
        $character->save();
        $auditTrail->record($character, 'avatar_mode.updated', metadata: [
            'before' => $previous,
            'after' => (bool) $character->avatar_masked,
        ]);

        return redirect()->back();
    }
}
