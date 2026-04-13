<?php

namespace App\Http\Controllers\CharacterClass;

use App\Http\Controllers\Controller;
use App\Http\Requests\CharacterClass\StoreCharacterClassRequest;
use App\Http\Requests\CharacterClass\UpdateCharacterClassRequest;
use App\Models\CharacterClass;
use App\Models\Source;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CharacterClassController extends Controller
{
    public function index(): \Inertia\Response
    {
        $search = request('search', '');
        $guild = request('guild');

        $query = CharacterClass::query()->with(['source:id,name,shortcode,kind', 'subclasses.source:id,name,shortcode,kind']);

        if (!empty($search)) {
            $query->where('name', 'LIKE', "%{$search}%");
        }
        if ($guild === 'allowed') {
            $query->where('guild_enabled', true);
        } elseif ($guild === 'blocked') {
            $query->where('guild_enabled', false);
        }

        $classes = $query->orderBy('name')->get([
            'id', 'name', 'source_id', 'guild_enabled',
        ]);

        return Inertia::render('character-class/index', [
            'characterClasses' => Inertia::defer(fn () => $classes),
            'sources' => Source::query()->orderBy('shortcode')->orderBy('name')->get(['id', 'name', 'shortcode', 'kind']),
            'canManage' => true,
        ]);
    }

    public function store(StoreCharacterClassRequest $request): RedirectResponse
    {
        $class = new CharacterClass;
        $class->name = $request->input('name');
        $class->source_id = $request->input('source_id') ?: null;
        $class->guild_enabled = $request->boolean('guild_enabled', true);
        $class->save();
        return redirect()->back();
    }

    public function update(UpdateCharacterClassRequest $request, CharacterClass $characterClass): RedirectResponse
    {
        $characterClass->name = $request->input('name');
        $characterClass->source_id = $request->input('source_id') ?: null;
        $characterClass->guild_enabled = $request->boolean('guild_enabled', true);
        $characterClass->save();
        return redirect()->back();
    }

    public function destroy(CharacterClass $characterClass): RedirectResponse
    {
        $characterClass->delete();
        return redirect()->back();
    }
}
