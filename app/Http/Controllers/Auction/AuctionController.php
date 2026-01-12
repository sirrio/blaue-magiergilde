<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionRequest;
use App\Http\Requests\Auction\UpdateAuctionRequest;
use App\Models\Auction;
use App\Models\AuctionSetting;
use App\Models\BackstockItem;
use App\Models\Item;
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
                    ->select([
                        'id',
                        'auction_id',
                        'item_id',
                        'item_name',
                        'item_url',
                        'item_cost',
                        'item_rarity',
                        'item_type',
                        'snapshot_custom',
                        'notes',
                        'repair_current',
                        'repair_max',
                        'remaining_auctions',
                    ])
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

        $auctionSettings = AuctionSetting::current();

        return Inertia::render('auction/index', [
            'auctions' => $auctions,
            'items' => $items,
            'auctionSettings' => $auctionSettings->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
                'voice_channel_id',
                'voice_channel_name',
                'voice_channel_type',
                'voice_channel_guild_id',
                'voice_channel_is_thread',
            ]),
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
                    BackstockItem::query()->create([
                        'item_id' => $auctionItem->item_id,
                    'item_name' => $auctionItem->item_name,
                    'item_url' => $auctionItem->item_url,
                    'item_cost' => $auctionItem->item_cost,
                    'item_rarity' => $auctionItem->item_rarity,
                    'item_type' => $auctionItem->item_type,
                    'snapshot_custom' => $auctionItem->snapshot_custom ?? false,
                    'notes' => $auctionItem->notes,
                ]);
                continue;
            }

                $newAuction->auctionItems()->create([
                    'item_id' => $auctionItem->item_id,
                    'item_name' => $auctionItem->item_name,
                    'item_url' => $auctionItem->item_url,
                    'item_cost' => $auctionItem->item_cost,
                    'item_rarity' => $auctionItem->item_rarity,
                    'item_type' => $auctionItem->item_type,
                    'snapshot_custom' => $auctionItem->snapshot_custom ?? false,
                    'notes' => $auctionItem->notes,
                    'repair_current' => $auctionItem->repair_current,
                    'repair_max' => $auctionItem->repair_max,
                    'remaining_auctions' => $nextRemaining,
                ]);
            }
        });

        return redirect()->back();
    }
}
