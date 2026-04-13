<?php

namespace App\Http\Controllers\CharacterClass;

use App\Http\Controllers\Controller;
use App\Http\Requests\CharacterClass\StoreCharacterSubclassRequest;
use App\Http\Requests\CharacterClass\UpdateCharacterSubclassRequest;
use App\Models\CharacterClass;
use App\Models\CharacterSubclass;
use Illuminate\Http\RedirectResponse;

class CharacterSubclassController extends Controller
{
    public function store(StoreCharacterSubclassRequest $request, CharacterClass $characterClass): RedirectResponse
    {
        $subclass = new CharacterSubclass;
        $subclass->character_class_id = $characterClass->id;
        $subclass->name = $request->input('name');
        $subclass->source_id = $request->input('source_id') ?: null;
        $subclass->guild_enabled = $request->boolean('guild_enabled', true);
        $subclass->save();

        return redirect()->back();
    }

    public function update(UpdateCharacterSubclassRequest $request, CharacterClass $characterClass, CharacterSubclass $subclass): RedirectResponse
    {
        abort_if($subclass->character_class_id !== $characterClass->id, 404);

        $subclass->name = $request->input('name');
        $subclass->source_id = $request->input('source_id') ?: null;
        $subclass->guild_enabled = $request->boolean('guild_enabled', true);
        $subclass->save();

        return redirect()->back();
    }

    public function destroy(CharacterClass $characterClass, CharacterSubclass $subclass): RedirectResponse
    {
        abort_if($subclass->character_class_id !== $characterClass->id, 404);

        $subclass->delete();

        return redirect()->back();
    }
}
