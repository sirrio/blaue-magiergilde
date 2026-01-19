<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\AddSpellRequest;
use App\Models\ShopItem;
use App\Models\Spell;
use Illuminate\Http\RedirectResponse;

class AddSpellToItemController extends Controller
{
    public function __invoke(AddSpellRequest $request, ShopItem $shopItem): RedirectResponse
    {
        $query = Spell::query()->whereIn('spell_level', $request->spell_levels);

        if ($request->filled('spell_schools')) {
            $query->whereIn('spell_school', $request->spell_schools);
        }

        $spell = $query->inRandomOrder()->first();

        if ($spell) {
            $shopItem->spell_id = $spell->id;
            $shopItem->spell_name = $spell->name;
            $shopItem->spell_url = $spell->url;
            $shopItem->spell_legacy_url = $spell->legacy_url;
            $shopItem->spell_level = $spell->spell_level;
            $shopItem->spell_school = $spell->spell_school;
            $shopItem->save();
        }

        return redirect()->back();
    }
}
