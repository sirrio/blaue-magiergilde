<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateCharacterManualOverridesRequest;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
use Illuminate\Http\RedirectResponse;

class CharacterManualOverridesController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(
        UpdateCharacterManualOverridesRequest $request,
        Character $character,
        CharacterAuditTrail $auditTrail,
    ): RedirectResponse {
        $previous = [
            'manual_adventures_count' => $character->manual_adventures_count,
            'manual_faction_rank' => $character->manual_faction_rank,
        ];

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
        $auditTrail->record($character, 'manual_overrides.updated', metadata: [
            'before' => $previous,
            'after' => [
                'manual_adventures_count' => $character->manual_adventures_count,
                'manual_faction_rank' => $character->manual_faction_rank,
            ],
        ]);

        return back();
    }
}
