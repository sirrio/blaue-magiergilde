<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Models\BackstockItem;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class RefreshBackstockItemSnapshotController extends Controller
{
    public function __invoke(BackstockItem $backstockItem): RedirectResponse
    {
        $item = Item::query()
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type'])
            ->find($backstockItem->item_id);

        if (! $item) {
            throw ValidationException::withMessages([
                'snapshot' => 'Item not found in compendium.',
            ]);
        }

        $backstockItem->item_name = $item->name;
        $backstockItem->item_url = $item->url;
        $backstockItem->item_cost = $item->cost;
        $backstockItem->item_rarity = $item->rarity;
        $backstockItem->item_type = $item->type;
        $backstockItem->snapshot_custom = false;
        $backstockItem->save();

        return redirect()->back();
    }
}
