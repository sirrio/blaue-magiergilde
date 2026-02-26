<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionItemRequest;
use App\Models\Auction;
use App\Models\AuctionItem;
use App\Models\Item;
use App\Support\ItemCostResolver;
use App\Support\ItemPricing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuctionItemController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAuctionItemRequest $request, Auction $auction): RedirectResponse
    {
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

        $item = Item::query()
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type'])
            ->with('mundaneVariants:id,name,slug,category,cost_gp,is_placeholder,sort_order')
            ->find($request->item_id);
        $costValue = $item ? ItemPricing::baseCostGp($item->rarity, $item->type) : null;
        $repairMax = $costValue;

        if ($repairCurrent === null) {
            $repairCurrent = $costValue !== null ? intdiv($costValue, 10) : 0;
        }

        DB::transaction(function () use (
            $auction,
            $notes,
            $request,
            $repairCurrent,
            $repairMax,
            $item,
        ): void {
            $lockedAuction = Auction::query()
                ->lockForUpdate()
                ->findOrFail($auction->id);

            if ($lockedAuction->status !== 'open') {
                throw ValidationException::withMessages([
                    'auction' => 'Auction is closed.',
                ]);
            }

            $lockedAuction->auctionItems()->create([
                'item_id' => $request->item_id,
                'item_name' => $item?->name,
                'item_url' => $item?->url,
                'item_cost' => $item ? ItemCostResolver::resolveForItem($item) : null,
                'item_rarity' => $item?->rarity,
                'item_type' => $item?->type,
                'snapshot_custom' => false,
                'notes' => $notes,
                'remaining_auctions' => $request->remaining_auctions,
                'repair_current' => $repairCurrent,
                'repair_max' => $repairMax,
            ]);
        });

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, AuctionItem $auctionItem): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $auctionItem->delete();

        return redirect()->back();
    }
}
