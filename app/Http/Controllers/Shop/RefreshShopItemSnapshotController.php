<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ShopItem;
use App\Models\Spell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class RefreshShopItemSnapshotController extends Controller
{
    public function __invoke(ShopItem $shopItem): RedirectResponse
    {
        $item = Item::query()
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type'])
            ->find($shopItem->item_id);

        if (! $item) {
            throw ValidationException::withMessages([
                'snapshot' => 'Item not found in compendium.',
            ]);
        }

        $shopItem->item_name = $item->name;
        $shopItem->item_url = $item->url;
        $shopItem->item_cost = $item->cost;
        $shopItem->item_rarity = $item->rarity;
        $shopItem->item_type = $item->type;

        if ($shopItem->spell_id) {
            $spell = Spell::query()
                ->select(['id', 'name', 'url', 'legacy_url', 'spell_level', 'spell_school'])
                ->find($shopItem->spell_id);

            if ($spell) {
                $shopItem->spell_name = $spell->name;
                $shopItem->spell_url = $spell->url;
                $shopItem->spell_legacy_url = $spell->legacy_url;
                $shopItem->spell_level = $spell->spell_level;
                $shopItem->spell_school = $spell->spell_school;
            }
        }

        $shopItem->snapshot_custom = false;
        $shopItem->save();

        return redirect()->back();
    }
}
