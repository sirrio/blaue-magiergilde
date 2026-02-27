<?php

namespace App\Http\Controllers\Ally;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ally\StoreAllyRequest;
use App\Http\Requests\Ally\UpdateAllyRequest;
use App\Models\Ally;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class AllyController extends Controller
{
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
    public function store(StoreAllyRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $ally = new Ally;
        $ally->name = $validated['name'];
        $ally->rating = $validated['rating'];
        $ally->character_id = $validated['character_id'];
        if ($request->file('avatar')) {
            $ally->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $ally->notes = $validated['notes'] ?? null;
        $ally->species = $validated['species'] ?? null;
        $ally->classes = $validated['classes'] ?? null;
        $ally->linked_character_id = $validated['linked_character_id'] ?? null;
        $ally->save();

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Ally $ally)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Ally $ally)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAllyRequest $request, Ally $ally): RedirectResponse
    {
        $validated = $request->validated();

        $ally->name = $validated['name'];
        $ally->rating = $validated['rating'];
        if ($request->file('avatar')) {
            $ally->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $ally->notes = $validated['notes'] ?? null;
        $ally->species = $validated['species'] ?? null;
        $ally->classes = $validated['classes'] ?? null;
        $ally->linked_character_id = $validated['linked_character_id'] ?? null;
        $ally->save();

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Ally $ally): RedirectResponse
    {
        $userId = auth()->id();
        $ownsCharacter = Character::query()
            ->whereKey($ally->character_id)
            ->where('user_id', $userId)
            ->exists();

        abort_unless($ownsCharacter, 403);

        $ally->delete();

        return redirect()->back();
    }
}
