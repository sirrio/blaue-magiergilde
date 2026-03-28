<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdatePrivateModeRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class PrivateModeController extends Controller
{
    public function __invoke(UpdatePrivateModeRequest $request, Character $character): RedirectResponse
    {
        $character->private_mode = $request->boolean('private_mode');
        $character->save();

        return redirect()->back();
    }
}
