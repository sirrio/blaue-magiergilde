<?php

namespace App\Http\Controllers\Spell;

use App\Http\Controllers\Controller;
use App\Http\Requests\Spell\StoreSpellRequest;
use App\Http\Requests\Spell\UpdateSpellRequest;
use App\Models\Spell;
use Illuminate\Http\RedirectResponse;
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
        $guild = request('guild');
        $info = request('info');
        $ruling = request('ruling');
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
        if ($guild === 'allowed') {
            $spellQuery->where('guild_enabled', true);
        } elseif ($guild === 'blocked') {
            $spellQuery->where(function ($query) {
                $query->whereNull('guild_enabled')->orWhere('guild_enabled', false);
            });
        }
        if ($info === 'complete') {
            $spellQuery
                ->whereNotNull('url')
                ->where('url', '!=', '')
                ->whereNotNull('spell_school')
                ->where('spell_school', '!=', '');
        } elseif ($info === 'missing') {
            $spellQuery->where(function ($query) {
                $query
                    ->whereNull('url')
                    ->orWhere('url', '')
                    ->orWhereNull('spell_school')
                    ->orWhere('spell_school', '');
            });
        }
        if ($ruling === 'changed') {
            $spellQuery->where('ruling_changed', true);
        } elseif ($ruling === 'none') {
            $spellQuery->where(function ($query) {
                $query->whereNull('ruling_changed')->orWhere('ruling_changed', false);
            });
        }

        $spells = $spellQuery
            ->orderBy('spell_level')
            ->orderBy('name')
            ->select(['id', 'name', 'url', 'legacy_url', 'spell_school', 'spell_level', 'guild_enabled', 'ruling_changed', 'ruling_note'])
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
    public function store(StoreSpellRequest $request): RedirectResponse
    {
        $spell = new Spell();

        $spell->name = $request->name;
        $spell->url = $request->input('url');
        $spell->legacy_url = $request->input('legacy_url');
        $spell->spell_school = $request->input('spell_school');
        $spell->spell_level = (int) $request->input('spell_level', 0);
        $spell->guild_enabled = $request->boolean('guild_enabled', true);

        $hasRulingChange = $request->boolean('ruling_changed');
        $note = $hasRulingChange ? trim((string) $request->input('ruling_note', '')) : '';
        $spell->ruling_changed = $hasRulingChange;
        $spell->ruling_note = $note !== '' ? $note : null;

        $spell->save();

        return redirect()->back();
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
        $spells->guild_enabled = $request->boolean('guild_enabled', true);

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
