<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\StoreCharacterRequest;
use App\Http\Requests\Character\UpdateCharacterRequest;
use App\Models\Character;
use App\Models\Game;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CharacterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $characters = Character::query()
            ->where('user_id', Auth::user()->getAuthIdentifier())
            ->withTrashed()
            ->withCount('room')
            ->with('adventures')
            ->orderBy('position')
            ->get();
        $guildCharacters = Character::query()
            ->whereNull('deleted_at')
            ->where('guild_status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'avatar', 'guild_status']);
        $games = Game::query()
            ->where('user_id', Auth::user()->getAuthIdentifier())
            ->get();

        return Inertia::render('character/index', [
            'user' => Auth::user(),
            'characters' => $characters,
            'guildCharacters' => $guildCharacters,
            'games' => $games,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create() {}

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCharacterRequest $request): RedirectResponse
    {
        $character = new Character;
        $character->name = $request->name;
        $character->faction = $request->faction;
        $character->notes = $request->notes;
        $character->is_filler = $request->is_filler;
        $character->version = $request->version;
        $character->dm_bubbles = $request->dm_bubbles;
        $character->dm_coins = $request->dm_coins;
        $character->bubble_shop_spend = $request->bubble_shop_spend;
        $character->user_id = Auth::user()->getAuthIdentifier();
        $character->start_tier = $request->start_tier;
        $character->external_link = $request->external_link;
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        $character->characterClasses()->sync($classIds);

        return to_route('characters.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Character $character): Response
    {
        $this->ensureCharacterOwner($character);

        $guildCharacters = Character::query()
            ->whereNull('deleted_at')
            ->where('guild_status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'avatar', 'guild_status']);

        return Inertia::render('character/show', [
            'character' => $character->load('adventures.allies.linkedCharacter'),
            'guildCharacters' => $guildCharacters,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Character $character)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCharacterRequest $request, Character $character): RedirectResponse
    {
        $this->ensureCharacterOwner($character);

        $character->name = $request->name;
        $character->faction = $request->faction;
        $character->notes = $request->notes;
        $character->version = $request->version;
        $character->dm_bubbles = $request->dm_bubbles;
        $character->dm_coins = $request->dm_coins;
        $character->bubble_shop_spend = $request->bubble_shop_spend;
        $character->external_link = $request->external_link;
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        $character->characterClasses()->sync($classIds);

        return to_route('characters.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Character $character): RedirectResponse
    {
        $this->ensureCharacterOwner($character);

        if ($character->guild_status === 'approved') {
            $character->guild_status = 'retired';
        }
        $character->save();

        $character->adventures()->update([
            'deleted_by_character' => true,
        ]);
        $character->downtimes()->update([
            'deleted_by_character' => true,
        ]);

        $character->adventures()->delete();
        $character->downtimes()->delete();
        $character->delete();

        return redirect()->back();
    }

    private function ensureCharacterOwner(Character $character): void
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }
    }
}
