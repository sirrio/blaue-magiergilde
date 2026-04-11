<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ShopItem;
use App\Models\Spell;
use App\Support\ItemCostResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class RefreshShopItemSnapshotController extends Controller
{
    public function __invoke(ShopItem $shopItem): RedirectResponse
    {
        $item = Item::query()
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type', 'ruling_changed', 'ruling_note'])
            ->with('mundaneVariants:id,name,slug,category,cost_gp,is_placeholder,sort_order')
            ->find($shopItem->item_id);

        if (! $item) {
            throw ValidationException::withMessages([
                'snapshot' => 'Item not found in compendium.',
            ]);
        }

        $shopItem->item_name = $item->name;
        $shopItem->item_url = $item->url;
        $shopItem->item_cost = ItemCostResolver::resolveForItem($item);
        $shopItem->item_rarity = $item->rarity;
        $shopItem->item_type = $item->type;
        $shopItem->item_ruling_changed = (bool) $item->ruling_changed;
        $shopItem->item_ruling_note = $item->ruling_note;

        if ($shopItem->spell_id) {
            $spell = Spell::query()
                ->select(['id', 'name', 'url', 'legacy_url', 'spell_level', 'spell_school', 'ruling_changed', 'ruling_note'])
                ->find($shopItem->spell_id);

            if ($spell) {
                $shopItem->spell_name = $spell->name;
                $shopItem->spell_url = $spell->url;
                $shopItem->spell_legacy_url = $spell->legacy_url;
                $shopItem->spell_level = $spell->spell_level;
                $shopItem->spell_school = $spell->spell_school;
                $shopItem->spell_ruling_changed = (bool) $spell->ruling_changed;
                $shopItem->spell_ruling_note = $spell->ruling_note;
            }
        }

        $shopItem->snapshot_custom = false;
        $shopItem->save();

        return redirect()->back();
    }
}
