<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionBidRequest;
use App\Models\AuctionBid;
use App\Models\AuctionItem;
use App\Models\Auction;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
        DB::transaction(function () use ($request, $auctionItem): void {
            $lockedItem = AuctionItem::query()
                ->with(['item', 'hiddenBids'])
                ->lockForUpdate()
                ->findOrFail($auctionItem->id);

            $lockedAuction = Auction::query()
                ->lockForUpdate()
                ->findOrFail($lockedItem->auction_id);

            if ($lockedAuction->status !== 'open') {
                throw ValidationException::withMessages([
                    'auction' => 'Auction is closed.',
                ]);
            }

            $step = $this->getBidStep($lockedItem->item);
            $highestBid = (int) $lockedItem->bids()->max('amount');
            $minBid = $highestBid > 0
                ? max($lockedItem->starting_bid, $highestBid + $step)
                : $lockedItem->starting_bid;

            $amount = (int) $request->amount;
            $hiddenBid = $lockedItem->hiddenBids
                ->firstWhere('bidder_discord_id', $request->bidder_discord_id);

            if ($hiddenBid && $amount > $hiddenBid->max_amount) {
                throw ValidationException::withMessages([
                    'amount' => "Max bid for {$hiddenBid->bidder_name} is {$hiddenBid->max_amount}.",
                ]);
            }

            if ($amount < $minBid) {
                throw ValidationException::withMessages([
                    'amount' => "Minimum bid is {$minBid}.",
                ]);
            }

            if (($amount - $lockedItem->starting_bid) % $step !== 0) {
                throw ValidationException::withMessages([
                    'amount' => "Bids must be in steps of {$step}.",
                ]);
            }

            $lockedItem->bids()->create([
                'bidder_name' => $request->bidder_name,
                'bidder_discord_id' => $request->bidder_discord_id,
                'amount' => $request->amount,
                'created_by' => $request->user()->id,
            ]);
        });

        return redirect()->back();
    }

    /**
     * Remove the specified bid.
     */
    public function destroy(Request $request, AuctionBid $auctionBid): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $auctionBid->delete();

        return redirect()->back();
    }
}
