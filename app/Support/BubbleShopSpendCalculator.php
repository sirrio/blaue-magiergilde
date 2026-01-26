<?php

namespace App\Support;

use App\Models\Character;
use App\Models\CharacterShopPurchase;

class BubbleShopSpendCalculator
{
    public function total(Character $character): int
    {
        $manualSpend = $this->safeInt($character->bubble_shop_spend);
        $purchaseSpend = $this->purchaseSpend($character);

        return $manualSpend + $purchaseSpend;
    }

    public function purchaseSpend(Character $character): int
    {
        if ($character->relationLoaded('shopPurchases')) {
            return (int) $character->shopPurchases->sum('cost');
        }

        return (int) CharacterShopPurchase::query()
            ->where('character_id', $character->id)
            ->sum('cost');
    }

    private function safeInt(mixed $value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }
}
