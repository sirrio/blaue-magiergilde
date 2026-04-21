<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\UpdateCharacterBubbleShopRequest;
use App\Models\Character;
use App\Support\CharacterBubbleShop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class CharacterBubbleShopController extends Controller
{
    public function __invoke(
        UpdateCharacterBubbleShopRequest $request,
        Character $character,
        CharacterBubbleShop $bubbleShop,
    ): RedirectResponse {
        DB::transaction(function () use ($request, $character, $bubbleShop): void {
            foreach (CharacterBubbleShop::purchaseTypes() as $type) {
                $quantity = max(0, $request->integer($type));

                if ($quantity === 0) {
                    $character->bubbleShopPurchases()->where('type', $type)->delete();

                    continue;
                }

                $character->bubbleShopPurchases()->updateOrCreate(
                    ['type' => $type],
                    ['quantity' => $quantity, 'details' => null],
                );
            }

            $character->load('bubbleShopPurchases');
            $bubbleShop->syncEffectiveSpend($character);
            $character->save();
        });

        return back();
    }
}
