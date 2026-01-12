<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopItem;
use Illuminate\Http\RedirectResponse;

class RemoveSpellFromItemController extends Controller
{
    public function __invoke(ShopItem $shopItem): RedirectResponse
    {
        $shopItem->spell_id = null;
        $shopItem->spell_name = null;
        $shopItem->spell_url = null;
        $shopItem->spell_legacy_url = null;
        $shopItem->spell_level = null;
        $shopItem->spell_school = null;
        $shopItem->save();

        return redirect()->back();
    }
}
