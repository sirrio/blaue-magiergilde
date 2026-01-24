<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\StoreCharacterRequest;
use App\Http\Requests\Character\UpdateCharacterRequest;
use App\Models\Character;
use App\Models\Game;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CharacterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $simplifiedTracking = $user?->simplified_tracking ?? false;

        $characters = Character::query()
            ->where('user_id', $user?->getAuthIdentifier())
            ->withTrashed()
            ->withCount('room')
            ->with('adventures')
            ->orderBy('position')
            ->get();
        $characters->each(function (Character $character) use ($simplifiedTracking): void {
            $character->setAttribute('simplified_tracking', $simplifiedTracking);
        });
        $guildCharacters = Character::query()
            ->whereNull('deleted_at')
            ->where('guild_status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'avatar', 'guild_status']);
        $games = Game::query()
            ->where('user_id', $user?->getAuthIdentifier())
            ->get();

        return Inertia::render('character/index', [
            'user' => $user,
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
    public function store(
        StoreCharacterRequest $request,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
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
        $character->guild_status = $request->guild_status ?? 'pending';
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        $character->characterClasses()->sync($classIds);

        if ($character->guild_status === 'pending') {
            $result = $notificationService->syncAnnouncement($character);
            if (! $result['ok']) {
                Log::warning('Character approval channel notification failed.', [
                    'character_id' => $character->id,
                    'error' => $result['error'] ?? null,
                ]);
            }
        }

        return to_route('characters.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Character $character): Response
    {
        $this->ensureCharacterOwner($character);
        $simplifiedTracking = Auth::user()?->simplified_tracking ?? false;
        $character->setAttribute('simplified_tracking', $simplifiedTracking);

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
    public function update(
        UpdateCharacterRequest $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);

        $previousStatus = $character->guild_status;
        $character->name = $request->name;
        $character->faction = $request->faction;
        $character->notes = $request->notes;
        $character->version = $request->version;
        $character->dm_bubbles = $request->dm_bubbles;
        $character->dm_coins = $request->dm_coins;
        $character->bubble_shop_spend = $request->bubble_shop_spend;
        $character->external_link = $request->external_link;
        if ($request->filled('guild_status')) {
            $character->guild_status = $request->guild_status;
        }
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        $character->characterClasses()->sync($classIds);

        $shouldSyncAnnouncement = $previousStatus !== $character->guild_status;
        if (! $shouldSyncAnnouncement && $character->guild_status === 'pending') {
            $shouldSyncAnnouncement = true;
        }

        if ($shouldSyncAnnouncement) {
            $result = $notificationService->syncAnnouncement($character);
            if (! $result['ok']) {
                Log::warning('Character approval channel notification failed.', [
                    'character_id' => $character->id,
                    'error' => $result['error'] ?? null,
                ]);
            }
        }

        return to_route('characters.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(
        Character $character,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);

        if ($character->guild_status === 'approved') {
            $character->guild_status = 'retired';
        }
        $character->save();

        $result = $notificationService->syncAnnouncement($character);
        if (! $result['ok']) {
            Log::warning('Character approval channel notification failed.', [
                'character_id' => $character->id,
                'error' => $result['error'] ?? null,
            ]);
        }

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
