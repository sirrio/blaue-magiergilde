<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateCharacterManualOverridesRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class CharacterManualOverridesController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(
        UpdateCharacterManualOverridesRequest $request,
        Character $character,
    ): RedirectResponse {
        if ($request->exists('manual_adventures_count_enabled')) {
            $character->manual_adventures_count = $request->boolean('manual_adventures_count_enabled')
                ? $request->integer('manual_adventures_count')
                : null;
        }

        if ($request->exists('manual_faction_rank_enabled')) {
            $character->manual_faction_rank = $request->boolean('manual_faction_rank_enabled')
                ? $request->integer('manual_faction_rank')
                : null;
        }

        $character->save();

        return back();
    }
}
