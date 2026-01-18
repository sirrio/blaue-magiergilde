<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateSimplifiedLevelRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class UpdateSimplifiedLevelController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(UpdateSimplifiedLevelRequest $request, Character $character): RedirectResponse
    {
        $character->simplified_level = (int) $request->input('simplified_level');
        $character->save();

        return redirect()->back();
    }
}
