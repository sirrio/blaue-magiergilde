<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\UpdateShopItemNoteRequest;
use App\Models\ShopItem;
use Illuminate\Http\RedirectResponse;

class UpdateShopItemNoteController extends Controller
{
    public function __invoke(UpdateShopItemNoteRequest $request, ShopItem $shopItem): RedirectResponse
    {
        $shopItem->notes = $request->validated()['notes'] ?? null;
        $shopItem->save();

        return redirect()->back();
    }
}
