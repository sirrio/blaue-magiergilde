<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdatePrivateModeRequest;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
use Illuminate\Http\RedirectResponse;

class PrivateModeController extends Controller
{
    public function __invoke(UpdatePrivateModeRequest $request, Character $character, CharacterAuditTrail $auditTrail): RedirectResponse
    {
        $previous = (bool) $character->private_mode;
        $character->private_mode = $request->boolean('private_mode');
        $character->save();
        $auditTrail->record($character, 'private_mode.updated', metadata: [
            'before' => $previous,
            'after' => (bool) $character->private_mode,
        ]);

        return redirect()->back();
    }
}
