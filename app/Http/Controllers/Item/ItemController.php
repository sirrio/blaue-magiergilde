<?php

namespace App\Http\Controllers\Item;

use App\Http\Controllers\Controller;
use App\Http\Requests\Item\StoreItemRequest;
use App\Http\Requests\Item\UpdateItemRequest;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $rarity = request('rarity');
        $type = request('type');
        $searchTerm = request('search');

        $itemQuery = Item::query();

        if (! empty($searchTerm)) {
            $itemQuery->where('name', 'LIKE', "%$searchTerm%");
        }
        if (! empty($rarity)) {
            $itemQuery->where('rarity', $rarity);
        }
        if (! empty($type)) {
            $itemQuery->where('type', $type);
        }

        $items = $itemQuery
            ->orderBy('rarity')
            ->orderBy('type')
            ->select([
                'id',
                'name',
                'cost',
                'url',
                'rarity',
                'type',
                'pick_count',
                'shop_enabled',
                'guild_enabled',
                'default_spell_roll_enabled',
                'default_spell_levels',
                'default_spell_schools',
                'ruling_changed',
                'ruling_note',
            ])
            ->get();

        return Inertia::render('item/index', [
            'items' => Inertia::defer(fn () => $items)->merge(),
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
    public function store(StoreItemRequest $request): RedirectResponse
    {
        $item = new Item;

        $item->name = $request->name;
        $item->cost = $request->cost;
        $item->url = $request->url;
        $item->rarity = $request->rarity;
        $item->type = $request->type;
        $item->shop_enabled = $request->boolean('shop_enabled', true);
        $item->guild_enabled = $request->boolean('guild_enabled', true);
        $this->applyRulingNote($item, $request);
        $this->applyDefaultSpellRoll($item, $request);
        $item->save();

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Item $item)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Item $item)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateItemRequest $request, Item $item): RedirectResponse
    {
        $item->name = $request->name;
        $item->cost = $request->cost;
        $item->url = $request->url;
        $item->rarity = $request->rarity;
        $item->type = $request->type;
        $item->shop_enabled = $request->boolean('shop_enabled', true);
        $item->guild_enabled = $request->boolean('guild_enabled', true);
        $this->applyRulingNote($item, $request);
        $this->applyDefaultSpellRoll($item, $request);
        $item->save();

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Item $item)
    {
        //
    }

    private function applyDefaultSpellRoll(Item $item, Request $request): void
    {
        $levels = $request->input('default_spell_levels');
        $schools = $request->input('default_spell_schools');

        $levels = array_values(array_unique(array_filter(array_map(
            static fn ($value) => is_numeric($value) ? (int) $value : null,
            (array) $levels
        ), static fn ($value) => $value !== null && $value >= 0 && $value <= 9)));
        $schools = array_values(array_unique(array_filter(array_map(
            static fn ($value) => $value !== null ? (string) $value : null,
            (array) $schools
        ), static fn ($value) => $value !== null && $value !== '')));

        $autoRoll = $request->boolean('default_spell_roll_enabled') && count($levels) > 0;

        $item->default_spell_roll_enabled = $autoRoll;
        $item->default_spell_levels = $autoRoll ? $levels : null;
        $item->default_spell_schools = $autoRoll ? ($schools === [] ? null : $schools) : null;
    }

    private function applyRulingNote(Item $item, Request $request): void
    {
        $hasRulingChange = $request->boolean('ruling_changed');
        $note = $hasRulingChange ? trim((string) $request->input('ruling_note', '')) : '';

        $item->ruling_changed = $hasRulingChange;
        $item->ruling_note = $note !== '' ? $note : null;
    }
}
