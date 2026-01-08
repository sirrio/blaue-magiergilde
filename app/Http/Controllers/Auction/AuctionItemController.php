<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionItemRequest;
use App\Models\Auction;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

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
    public function store(StoreAuctionItemRequest $request, Auction $auction): RedirectResponse
    {
        if ($auction->status !== 'open') {
            throw ValidationException::withMessages([
                'auction' => 'Auktion ist geschlossen.',
            ]);
        }

        $repairCurrent = $request->input('repair_current');
        $notes = $request->input('notes');

        if ($repairCurrent === '') {
            $repairCurrent = null;
        }

        if (is_string($notes)) {
            $notes = trim($notes);
        }

        if ($notes === '') {
            $notes = null;
        }

        $item = Item::query()->select(['id', 'cost', 'rarity', 'type'])->find($request->item_id);
        $costValue = $this->parseCostValue($item?->cost);
        $repairMax = $costValue;

        if ($repairCurrent === null) {
            $repairCurrent = $costValue !== null ? intdiv($costValue, 10) : 0;
        }

        $step = $item ? $this->getBidStep($item) : 1;
        $halfRepair = (int) ceil(((int) $repairCurrent) / 2);
        $startingBid = (int) (ceil($halfRepair / $step) * $step);

        $auction->auctionItems()->create([
            'item_id' => $request->item_id,
            'notes' => $notes,
            'starting_bid' => $startingBid,
            'remaining_auctions' => $request->remaining_auctions,
            'repair_current' => $repairCurrent,
            'repair_max' => $repairMax,
        ]);

        return redirect()->back();
    }
}
