<?php

namespace App\Http\Controllers\Spell;

use App\Http\Controllers\Controller;
use App\Http\Requests\Spell\StoreSpellRequest;
use App\Http\Requests\Spell\UpdateSpellRequest;
use App\Models\Spell;
use Inertia\Inertia;

class SpellController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): \Inertia\Response
    {
        $spellSchool = request('spell_school', null);
        $spellLevel = request('spell_level', null);
        $searchTerm = request('search', '');

        $spellQuery = Spell::query();

        if (! empty($searchTerm)) {
            $spellQuery->where('name', 'LIKE', "%{$searchTerm}%");
        }
        if (! empty($spellSchool)) {
            $spellQuery->where('spell_school', $spellSchool);
        }
        if (! empty($spellLevel)) {
            $spellQuery->where('spell_level', $spellLevel);
        }

        $spells = $spellQuery
            ->orderBy('spell_level')
            ->select(['id', 'name', 'url', 'legacy_url', 'spell_school', 'spell_level', 'ruling_changed', 'ruling_note'])
            ->get();

        return Inertia::render('spell/index', [
            'spells' => Inertia::defer(fn () => $spells),
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
    public function store(StoreSpellRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Spell $spells)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Spell $spells)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSpellRequest $request, Spell $spells)
    {
        $spells->name = $request->name;
        $spells->url = $request->input('url');
        $spells->legacy_url = $request->input('legacy_url');
        $spells->spell_school = $request->input('spell_school');
        $spells->spell_level = (int) $request->input('spell_level', 0);

        $hasRulingChange = $request->boolean('ruling_changed');
        $note = $hasRulingChange ? trim((string) $request->input('ruling_note', '')) : '';
        $spells->ruling_changed = $hasRulingChange;
        $spells->ruling_note = $note !== '' ? $note : null;

        $spells->save();

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Spell $spells)
    {
        //
    }
}
