<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionRequest;
use App\Http\Requests\Auction\UpdateAuctionRequest;
use App\Models\Auction;
use App\Models\Item;
use App\Models\VoiceSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AuctionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        if (! Auction::query()->exists()) {
            Auction::query()->create([
                'title' => null,
                'status' => 'open',
                'currency' => 'GP',
            ]);
        }

        $auctions = Auction::query()
            ->with([
                'auctionItems' => fn ($query) => $query
                    ->select(['id', 'auction_id', 'item_id', 'notes', 'starting_bid', 'repair_current', 'repair_max', 'remaining_auctions'])
                    ->orderBy('id'),
                'auctionItems.item' => fn ($query) => $query->select(['id', 'name', 'url', 'cost', 'rarity', 'type', 'pick_count']),
                'auctionItems.bids' => fn ($query) => $query
                    ->select(['id', 'auction_item_id', 'bidder_name', 'bidder_discord_id', 'amount', 'created_at'])
                    ->orderByDesc('amount')
                    ->orderByDesc('created_at'),
                'auctionItems.hiddenBids' => fn ($query) => $query
                    ->select(['id', 'auction_item_id', 'bidder_name', 'bidder_discord_id', 'max_amount', 'created_at'])
                    ->orderByDesc('created_at'),
            ])
            ->orderByDesc('created_at')
            ->select(['id', 'title', 'status', 'currency', 'created_at', 'posted_at'])
            ->get();

        $items = Item::query()
            ->orderBy('name')
            ->select(['id', 'name', 'rarity', 'type', 'cost', 'url'])
            ->get();

        $voiceSettings = VoiceSetting::current();

        return Inertia::render('auction/index', [
            'auctions' => $auctions,
            'items' => $items,
            'voiceSettings' => $voiceSettings,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAuctionRequest $request): RedirectResponse
    {
        Auction::query()->create([
            'title' => null,
            'status' => 'open',
            'currency' => 'GP',
        ]);

        return redirect()->back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAuctionRequest $request, Auction $auction): RedirectResponse
    {
        DB::transaction(function () use ($request, $auction): void {
            $lockedAuction = Auction::query()
                ->lockForUpdate()
                ->findOrFail($auction->id);

            $isClosing = $lockedAuction->status !== 'closed' && $request->status === 'closed';

            $lockedAuction->title = null;
            $lockedAuction->status = $request->status;
            $lockedAuction->currency = 'GP';
            $lockedAuction->save();

            if (! $isClosing) {
                return;
            }

            $newAuction = Auction::query()->create([
                'title' => null,
                'status' => 'open',
                'currency' => 'GP',
            ]);

            $carryItems = $lockedAuction->auctionItems()
                ->whereDoesntHave('bids')
                ->lockForUpdate()
                ->get();

            foreach ($carryItems as $auctionItem) {
                $remaining = (int) ($auctionItem->remaining_auctions ?? 0);
                $nextRemaining = $remaining - 1;

                if ($nextRemaining <= 0) {
                    continue;
                }

                $newAuction->auctionItems()->create([
                    'item_id' => $auctionItem->item_id,
                    'notes' => $auctionItem->notes,
                    'starting_bid' => $auctionItem->starting_bid,
                    'repair_current' => $auctionItem->repair_current,
                    'repair_max' => $auctionItem->repair_max,
                    'remaining_auctions' => $nextRemaining,
                ]);
            }
        });

        return redirect()->back();
    }
}
