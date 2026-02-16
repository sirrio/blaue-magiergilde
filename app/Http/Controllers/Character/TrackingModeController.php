<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateTrackingModeRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class TrackingModeController extends Controller
{
    public function __invoke(UpdateTrackingModeRequest $request, Character $character): RedirectResponse
    {
        $character->simplified_tracking = $request->boolean('simplified_tracking');
        $character->save();

        return redirect()->back();
    }
}
