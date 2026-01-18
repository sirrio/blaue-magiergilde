<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateTrackingModeRequest;
use Illuminate\Http\RedirectResponse;

class TrackingModeController extends Controller
{
    public function __invoke(UpdateTrackingModeRequest $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $user->simplified_tracking = $request->boolean('simplified_tracking');
        $user->save();

        return redirect()->back();
    }
}
