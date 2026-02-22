<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionHiddenBidRequest;
use App\Models\Auction;
use App\Models\AuctionHiddenBid;
use App\Models\AuctionItem;
use App\Services\DiscordMemberLookupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuctionHiddenBidController extends Controller
{
    public function __construct(private readonly DiscordMemberLookupService $discordMemberLookup) {}

    /**
     * Store or update a hidden bid for the given auction item.
     */
    public function store(StoreAuctionHiddenBidRequest $request, AuctionItem $auctionItem): RedirectResponse
    {
        $currentAuction = Auction::query()
            ->select(['id', 'status'])
            ->findOrFail($auctionItem->auction_id);
        $currentItem = AuctionItem::query()
            ->select(['id', 'sold_at'])
            ->findOrFail($auctionItem->id);

        if ($currentAuction->status !== 'open') {
            throw ValidationException::withMessages([
                'auction' => 'Auction is closed.',
            ]);
        }

        if ($currentItem->sold_at) {
            throw ValidationException::withMessages([
                'auction_item' => 'Item is already sold.',
            ]);
        }

        $discordUserId = trim((string) $request->bidder_discord_id);
        $lookup = $this->discordMemberLookup->resolveGuildDisplayName($discordUserId);
        $resolvedName = null;

        if ($lookup['ok'] ?? false) {
            $resolvedName = trim((string) ($lookup['name'] ?? ''));
        }

        if ($resolvedName === null || $resolvedName === '') {
            $existing = AuctionHiddenBid::query()
                ->where('auction_item_id', $auctionItem->id)
                ->where('bidder_discord_id', $discordUserId)
                ->first();

            if ($existing && trim((string) $existing->bidder_name) !== '') {
                $resolvedName = trim((string) $existing->bidder_name);
            }
        }

        if ($resolvedName === null || $resolvedName === '') {
            throw ValidationException::withMessages([
                'bidder_discord_id' => $lookup['error'] ?? 'Discord member could not be resolved from guilds.',
            ]);
        }

        DB::transaction(function () use ($request, $auctionItem, $resolvedName): void {
            $lockedAuction = Auction::query()
                ->lockForUpdate()
                ->findOrFail($auctionItem->auction_id);

            $lockedItem = AuctionItem::query()
                ->lockForUpdate()
                ->findOrFail($auctionItem->id);

            if ($lockedAuction->status !== 'open') {
                throw ValidationException::withMessages([
                    'auction' => 'Auction is closed.',
                ]);
            }

            if ($lockedItem->sold_at) {
                throw ValidationException::withMessages([
                    'auction_item' => 'Item is already sold.',
                ]);
            }

            $lockedItem->hiddenBids()->updateOrCreate(
                [
                    'bidder_discord_id' => $request->bidder_discord_id,
                ],
                [
                    'bidder_name' => $resolvedName,
                    'max_amount' => $request->max_amount,
                ],
            );
        });

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
