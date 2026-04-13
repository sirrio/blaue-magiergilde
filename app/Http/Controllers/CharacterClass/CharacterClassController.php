<?php

namespace App\Http\Controllers\CharacterClass;

use App\Http\Controllers\Controller;
use App\Http\Requests\CharacterClass\StoreCharacterClassRequest;
use App\Http\Requests\CharacterClass\UpdateCharacterClassRequest;
use App\Models\CharacterClass;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CharacterClassController extends Controller
{
    public function index(): \Inertia\Response
    {
        $search = request('search', '');
        $query = CharacterClass::query();
        if (!empty($search)) {
            $query->where('name', 'LIKE', "%{$search}%");
        }
        $classes = $query->orderBy('name')->get(['id', 'name', 'src']);

        return Inertia::render('character-class/index', [
            'characterClasses' => Inertia::defer(fn () => $classes),
            'canManage' => true,
        ]);
    }

    public function store(StoreCharacterClassRequest $request): RedirectResponse
    {
        $class = new CharacterClass;
        $class->name = $request->input('name');
        $class->src = $request->input('src') ?: null;
        $class->save();
        return redirect()->back();
    }

    public function update(UpdateCharacterClassRequest $request, CharacterClass $characterClass): RedirectResponse
    {
        $characterClass->name = $request->input('name');
        $characterClass->src = $request->input('src') ?: null;
        $characterClass->save();
        return redirect()->back();
    }

    public function destroy(CharacterClass $characterClass): RedirectResponse
    {
        $characterClass->delete();
        return redirect()->back();
    }
}
