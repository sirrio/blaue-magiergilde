<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopItem;
use App\Services\ShopRollService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class RerollShopItemController extends Controller
{
    public function __invoke(ShopItem $shopItem, ShopRollService $shopRollService): RedirectResponse
    {
        $updated = $shopRollService->rerollLine($shopItem);

        if (! $updated) {
            throw ValidationException::withMessages([
                'shop_item' => 'No eligible replacement item found for this shop line.',
            ]);
        }

        return redirect()->back();
    }
}
