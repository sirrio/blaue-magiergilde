<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Models\AuctionItem;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class RefreshAuctionItemSnapshotController extends Controller
{
    public function __invoke(AuctionItem $auctionItem): RedirectResponse
    {
        $item = Item::query()
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type'])
            ->find($auctionItem->item_id);

        if (! $item) {
            throw ValidationException::withMessages([
                'snapshot' => 'Item not found in compendium.',
            ]);
        }

        $auctionItem->item_name = $item->name;
        $auctionItem->item_url = $item->url;
        $auctionItem->item_cost = $item->cost;
        $auctionItem->item_rarity = $item->rarity;
        $auctionItem->item_type = $item->type;
        $auctionItem->snapshot_custom = false;
        $auctionItem->save();

        return redirect()->back();
    }
}
