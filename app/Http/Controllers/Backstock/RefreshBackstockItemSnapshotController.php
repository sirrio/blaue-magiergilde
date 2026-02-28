<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Models\BackstockItem;
use App\Models\Item;
use App\Support\ItemCostResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class RefreshBackstockItemSnapshotController extends Controller
{
    public function __invoke(BackstockItem $backstockItem): RedirectResponse
    {
        $item = Item::query()
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type'])
            ->with('mundaneVariants:id,name,slug,category,cost_gp,is_placeholder,sort_order')
            ->find($backstockItem->item_id);

        if (! $item) {
            throw ValidationException::withMessages([
                'snapshot' => 'Item not found in compendium.',
            ]);
        }

        $backstockItem->item_name = $item->name;
        $backstockItem->item_url = $item->url;
        $backstockItem->item_cost = ItemCostResolver::resolveForItem($item);
        $backstockItem->item_rarity = $item->rarity;
        $backstockItem->item_type = $item->type;
        $backstockItem->snapshot_custom = false;
        $backstockItem->save();

        return redirect()->back();
    }
}
