<?php

namespace App\Http\Controllers\Game;

use App\Http\Controllers\Controller;
use App\Http\Requests\Game\StoreGameRequest;
use App\Http\Requests\Game\UpdateGameRequest;
use App\Models\Character;
use App\Models\Game;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GameController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $characters = Character::query()
            ->where('user_id', Auth::user()->getAuthIdentifier())
            ->with(['adventures' => fn ($q) => $q->withTrashed()])
            ->withTrashed()
            ->orderBy('position')
            ->get();
        $games = Game::query()
            ->where('user_id', Auth::user()->getAuthIdentifier())
            ->orderby('start_date', 'desc')
            ->get();

        return Inertia::render('game/index', [
            'user' => Auth::user(),
            'characters' => $characters,
            'games' => $games,
        ]);
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
    public function store(StoreGameRequest $request): \Illuminate\Http\RedirectResponse
    {
        $userId = $request->user()?->getAuthIdentifier();
        if (!$userId) {
            abort(403);
        }

        $game = new Game;
        $game->duration = $request->duration;
        $game->title = $request->title;
        $game->tier = $request->tier;
        $game->user_id = $userId;
        $game->start_date = $request->start_date;
        $game->has_additional_bubble = $request->has_additional_bubble;
        $game->tier_of_month_reward = $request->tier_of_month_reward ?: null;
        $game->sessions = $request->sessions;
        $game->notes = $request->notes;
        $game->save();

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Game $game)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Game $game)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateGameRequest $request, Game $game): \Illuminate\Http\RedirectResponse
    {
        $game->duration = $request->duration;
        $game->start_date = $request->start_date;
        $game->title = $request->title;
        $game->tier = $request->tier;
        $game->has_additional_bubble = $request->has_additional_bubble;
        $game->tier_of_month_reward = $request->tier_of_month_reward ?: null;
        $game->sessions = $request->sessions;
        $game->notes = $request->notes;
        $game->save();

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Game $game): \Illuminate\Http\RedirectResponse
    {
        $game->delete();

        return redirect()->back();
    }
}
