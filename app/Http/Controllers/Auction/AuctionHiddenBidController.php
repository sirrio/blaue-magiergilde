<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionHiddenBidRequest;
use App\Models\AuctionHiddenBid;
use App\Models\AuctionItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AuctionHiddenBidController extends Controller
{
    /**
     * Store or update a hidden bid for the given auction item.
     */
    public function store(StoreAuctionHiddenBidRequest $request, AuctionItem $auctionItem): RedirectResponse
    {
        $auctionItem->hiddenBids()->updateOrCreate(
            [
                'bidder_discord_id' => $request->bidder_discord_id,
            ],
            [
                'bidder_name' => $request->bidder_name,
                'max_amount' => $request->max_amount,
            ],
        );

        return redirect()->back();
    }

    /**
     * Remove the specified hidden bid.
     */
    public function destroy(Request $request, AuctionHiddenBid $auctionHiddenBid): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $auctionHiddenBid->delete();

        return redirect()->back();
    }
}
