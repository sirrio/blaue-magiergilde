<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\Character;
use App\Support\CharacterProgressionSnapshotResolver;
use App\Support\CharacterTrackingHistory;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DeletedCharacterController extends Controller
{
    public function __construct(private readonly CharacterProgressionSnapshotResolver $progressionSnapshots) {}

    public function __invoke(): Response
    {
        $history = new CharacterTrackingHistory;

        $characters = Character::onlyTrashed()
            ->with([
                'adventures' => fn ($q) => $q->withTrashed(),
                'downtimes' => fn ($q) => $q->withTrashed(),
                'characterClasses',
            ])
            ->where('user_id', Auth::id())
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->each(function (Character $character) use ($history): void {
                $history->filterTrackedRelations($character);
                $character->setAttribute('can_force_delete', $history->canPermanentlyDelete($character));
                $character->setAttribute('force_delete_block_reason', $history->permanentDeleteBlockReason($character));
            });
        $this->progressionSnapshots->attach($characters);

        return Inertia::render('character/deleted', [
            'characters' => $characters,
        ]);
    }
}
