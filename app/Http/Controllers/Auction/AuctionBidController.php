<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionBidRequest;
use App\Models\AuctionItem;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;

class AuctionBidController extends Controller
{
    private function getBidStep(Item $item): int
    {
        $baseStep = match ($item->rarity) {
            'uncommon' => 50,
            'rare' => 100,
            'very_rare' => 500,
            default => 10,
        };

        if (in_array($item->type, ['consumable', 'spellscroll'], true)) {
            $baseStep = intdiv($baseStep, 2);
        }

        return max(1, $baseStep);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAuctionBidRequest $request, AuctionItem $auctionItem): RedirectResponse
    {
        $auctionItem->loadMissing(['item', 'auction']);

        $step = $this->getBidStep($auctionItem->item);
        $highestBid = (int) $auctionItem->bids()->max('amount');
        $minBid = $highestBid > 0
            ? max($auctionItem->starting_bid, $highestBid + $step)
            : $auctionItem->starting_bid;

        $amount = (int) $request->amount;

        if ($amount < $minBid) {
            return redirect()->back()->withErrors([
                'amount' => "Mindestgebot ist {$minBid}.",
            ])->withInput();
        }

        if (($amount - $auctionItem->starting_bid) % $step !== 0) {
            return redirect()->back()->withErrors([
                'amount' => "Gebote muessen in Schritten von {$step} erfolgen.",
            ])->withInput();
        }

        $auctionItem->bids()->create([
            'bidder_discord_id' => $request->bidder_discord_id,
            'amount' => $request->amount,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->back();
    }
}
