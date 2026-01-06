<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionRequest;
use App\Http\Requests\Auction\UpdateAuctionRequest;
use App\Models\Auction;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AuctionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $auctions = Auction::query()
            ->with([
                'auctionItems' => fn ($query) => $query
                    ->select(['id', 'auction_id', 'item_id', 'starting_bid', 'repair_current', 'repair_max', 'remaining_auctions'])
                    ->orderBy('id'),
                'auctionItems.item' => fn ($query) => $query->select(['id', 'name', 'url', 'cost', 'rarity', 'type', 'pick_count']),
                'auctionItems.bids' => fn ($query) => $query
                    ->select(['id', 'auction_item_id', 'bidder_name', 'amount', 'created_at'])
                    ->orderByDesc('amount')
                    ->orderByDesc('created_at'),
            ])
            ->orderByDesc('created_at')
            ->select(['id', 'title', 'status', 'currency', 'voice_channel_id', 'voice_candidates', 'voice_updated_at', 'created_at', 'posted_at'])
            ->get();

        $items = Item::query()
            ->orderBy('name')
            ->select(['id', 'name', 'rarity', 'type', 'cost', 'url'])
            ->get();

        return Inertia::render('auction/index', [
            'auctions' => $auctions,
            'items' => $items,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAuctionRequest $request): RedirectResponse
    {
        Auction::query()->create([
            'title' => $request->input('title'),
            'status' => $request->input('status', 'open'),
            'currency' => $request->input('currency', 'GP'),
        ]);

        return redirect()->back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAuctionRequest $request, Auction $auction): RedirectResponse
    {
        $auction->title = $request->title;
        $auction->status = $request->status;
        $auction->currency = $request->currency;
        $auction->voice_channel_id = $request->voice_channel_id;
        if (! $auction->voice_channel_id) {
            $auction->voice_candidates = null;
            $auction->voice_updated_at = null;
        }
        $auction->save();

        return redirect()->back();
    }
}
