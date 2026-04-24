<?php

namespace App\Http\Controllers\Adventure;

use App\Http\Controllers\Controller;
use App\Http\Requests\Adventure\StoreAdventureRequest;
use App\Http\Requests\Adventure\UpdateAdventureRequest;
use App\Models\Adventure;
use App\Models\Ally;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
use Illuminate\Support\Facades\Config;

class AdventureController extends Controller
{
    public function __construct(private readonly CharacterAuditTrail $auditTrail) {}

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAdventureRequest $request): \Illuminate\Http\RedirectResponse
    {
        $adventure = new Adventure;
        $adventure->duration = $request->duration;
        $adventure->title = $request->title;
        $adventure->game_master = $request->game_master;
        $adventure->character_id = $request->character_id;
        $adventure->start_date = $request->start_date;
        $adventure->has_additional_bubble = $request->has_additional_bubble;
        $adventure->notes = $request->notes;
        $adventure->save();
        $allyIds = $request->input('ally_ids', []);
        $guildCharacterIds = array_values(array_unique(array_filter(
            $request->input('guild_character_ids', []),
            fn ($id) => (int) $id !== (int) $adventure->character_id,
        )));
        $guildAllies = $this->resolveGuildAllies($adventure->character_id, $guildCharacterIds);
        $adventure->allies()->sync(array_unique([...$allyIds, ...$guildAllies]));
        $this->auditTrail->record($adventure->character, 'adventure.created', delta: [
            'bubbles' => $this->bubblesForAdventure($adventure),
            'duration_seconds' => (int) $adventure->duration,
        ], metadata: [
            'title' => $adventure->title,
            'game_master' => $adventure->game_master,
            'start_date' => $adventure->start_date,
        ], subject: $adventure);

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Adventure $adventure)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Adventure $adventure)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAdventureRequest $request, Adventure $adventure): \Illuminate\Http\RedirectResponse
    {
        $previous = [
            'title' => $adventure->title,
            'duration' => (int) $adventure->duration,
            'bubbles' => $this->bubblesForAdventure($adventure),
            'start_date' => $adventure->start_date,
            'game_master' => $adventure->game_master,
            'has_additional_bubble' => (bool) $adventure->has_additional_bubble,
        ];
        $adventure->duration = $request->duration;
        $adventure->start_date = $request->start_date;
        $adventure->title = $request->title;
        $adventure->game_master = $request->game_master;
        $adventure->has_additional_bubble = $request->has_additional_bubble;
        $adventure->notes = $request->notes;
        $adventure->save();
        $allyIds = $request->input('ally_ids', []);
        $guildCharacterIds = array_values(array_unique(array_filter(
            $request->input('guild_character_ids', []),
            fn ($id) => (int) $id !== (int) $adventure->character_id,
        )));
        $guildAllies = $this->resolveGuildAllies($adventure->character_id, $guildCharacterIds);
        $adventure->allies()->sync(array_unique([...$allyIds, ...$guildAllies]));
        $this->auditTrail->record($adventure->character, 'adventure.updated', delta: [
            'bubbles' => $this->bubblesForAdventure($adventure) - $previous['bubbles'],
            'duration_seconds' => (int) $adventure->duration - $previous['duration'],
        ], metadata: [
            'before' => $previous,
            'after' => [
                'title' => $adventure->title,
                'duration' => (int) $adventure->duration,
                'bubbles' => $this->bubblesForAdventure($adventure),
                'start_date' => $adventure->start_date,
                'game_master' => $adventure->game_master,
                'has_additional_bubble' => (bool) $adventure->has_additional_bubble,
            ],
        ], subject: $adventure);

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Adventure $adventure): \Illuminate\Http\RedirectResponse
    {
        $character = $adventure->character;
        $bubbles = $this->bubblesForAdventure($adventure);
        $duration = (int) $adventure->duration;
        $metadata = [
            'title' => $adventure->title,
            'game_master' => $adventure->game_master,
            'start_date' => $adventure->start_date,
        ];
        $adventure->delete();
        $this->auditTrail->record($character, 'adventure.deleted', delta: [
            'bubbles' => -$bubbles,
            'duration_seconds' => -$duration,
        ], metadata: $metadata, subject: $adventure);

        return redirect()->back();
    }

    private function resolveGuildAllies(int $characterId, array $guildCharacterIds): array
    {
        if (count($guildCharacterIds) === 0) {
            return [];
        }

        $existing = Ally::query()
            ->where('character_id', $characterId)
            ->whereIn('linked_character_id', $guildCharacterIds)
            ->get()
            ->keyBy('linked_character_id');

        $characters = Character::query()
            ->whereIn('id', $guildCharacterIds)
            ->whereIn('guild_status', $this->guildCharacterStatusesForAllies())
            ->get(['id', 'name']);

        $createdIds = [];

        foreach ($characters as $character) {
            $ally = $existing->get($character->id);
            if (! $ally) {
                $ally = new Ally;
                $ally->character_id = $characterId;
                $ally->linked_character_id = $character->id;
                $ally->name = $character->name;
                $ally->rating = 3;
                $ally->save();
            }
            $createdIds[] = $ally->id;
        }

        return $createdIds;
    }

    private function bubblesForAdventure(Adventure $adventure): int
    {
        return intdiv((int) $adventure->duration, 10800) + ((bool) $adventure->has_additional_bubble ? 1 : 0);
    }

    /**
     * @return list<string>
     */
    private function guildCharacterStatusesForAllies(): array
    {
        $statuses = ['pending', 'approved', 'needs_changes'];

        if (! (bool) Config::get('features.character_status_switch', true)) {
            $statuses[] = 'draft';
        }

        return $statuses;
    }
}
