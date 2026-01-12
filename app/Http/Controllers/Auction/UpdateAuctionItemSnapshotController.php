<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\UpdateAuctionItemSnapshotRequest;
use App\Models\AuctionItem;
use Illuminate\Http\RedirectResponse;

class UpdateAuctionItemSnapshotController extends Controller
{
    public function __invoke(UpdateAuctionItemSnapshotRequest $request, AuctionItem $auctionItem): RedirectResponse
    {
        $payload = $request->validated();
        $name = trim((string) $payload['name']);
        $url = trim((string) ($payload['url'] ?? ''));
        $cost = trim((string) ($payload['cost'] ?? ''));

        $auctionItem->item_name = $name;
        $auctionItem->item_url = $url === '' ? null : $url;
        $auctionItem->item_cost = $cost === '' ? null : $cost;
        $auctionItem->item_rarity = $payload['rarity'];
        $auctionItem->item_type = $payload['type'];
        $auctionItem->snapshot_custom = true;
        $auctionItem->save();

        return redirect()->back();
    }
}
