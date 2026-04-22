<?php

namespace App\Http\Controllers\Compendium;

use App\Http\Controllers\Controller;
use App\Http\Requests\Compendium\StoreCompendiumCommentRequest;
use App\Models\CharacterClass;
use App\Models\CompendiumComment;
use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\Spell;
use Illuminate\Http\RedirectResponse;

class CompendiumCommentController extends Controller
{
    public function storeItem(StoreCompendiumCommentRequest $request, Item $item): RedirectResponse
    {
        $item->comments()->create([
            'user_id' => $request->user()->id,
            'body' => trim((string) $request->input('body')),
        ]);

        return redirect()->back();
    }

    public function storeSpell(StoreCompendiumCommentRequest $request, Spell $spell): RedirectResponse
    {
        $spell->comments()->create([
            'user_id' => $request->user()->id,
            'body' => trim((string) $request->input('body')),
        ]);

        return redirect()->back();
    }

    public function storeCharacterClass(StoreCompendiumCommentRequest $request, CharacterClass $characterClass): RedirectResponse
    {
        $characterClass->comments()->create([
            'user_id' => $request->user()->id,
            'body' => trim((string) $request->input('body')),
        ]);

        return redirect()->back();
    }

    public function storeMundaneItemVariant(StoreCompendiumCommentRequest $request, MundaneItemVariant $mundaneItemVariant): RedirectResponse
    {
        $mundaneItemVariant->comments()->create([
            'user_id' => $request->user()->id,
            'body' => trim((string) $request->input('body')),
        ]);

        return redirect()->back();
    }

    public function destroy(CompendiumComment $compendiumComment): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user && ($user->is_admin || $user->id === $compendiumComment->user_id), 403);

        $compendiumComment->delete();

        return redirect()->back();
    }
}
