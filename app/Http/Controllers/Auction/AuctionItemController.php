<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionItemRequest;
use App\Models\Auction;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;

class AuctionItemController extends Controller
{
    private function parseCostValue(?string $cost): ?int
    {
        if ($cost === null) {
            return null;
        }

        $digits = preg_replace('/[^0-9]/', '', $cost);

        if ($digits === '') {
            return null;
        }

        return (int) $digits;
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAuctionItemRequest $request, Auction $auction): RedirectResponse
    {
        $repairCurrent = $request->input('repair_current');
        $repairMax = $request->input('repair_max');

        if ($repairCurrent === '') {
            $repairCurrent = null;
        }
        if ($repairMax === '') {
            $repairMax = null;
        }

        if ($repairCurrent === null && $repairMax === null) {
            $item = Item::query()->select(['id', 'cost'])->find($request->item_id);
            $costValue = $this->parseCostValue($item?->cost);

            if ($costValue !== null) {
                $repairMax = $costValue;
                $repairCurrent = intdiv($costValue, 20);
            }
        }

        $auction->auctionItems()->create([
            'item_id' => $request->item_id,
            'starting_bid' => $request->starting_bid,
            'remaining_auctions' => $request->remaining_auctions,
            'repair_current' => $repairCurrent,
            'repair_max' => $repairMax,
        ]);

        return redirect()->back();
    }
}
