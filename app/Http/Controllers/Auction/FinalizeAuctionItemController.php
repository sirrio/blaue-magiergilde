<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Models\AuctionBid;
use App\Models\AuctionItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class FinalizeAuctionItemController extends Controller
{
    public function __invoke(AuctionItem $auctionItem): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $highestBid = DB::transaction(function () use ($auctionItem): AuctionBid {
            $lockedItem = AuctionItem::query()
                ->lockForUpdate()
                ->findOrFail($auctionItem->id);

            if ($lockedItem->sold_at) {
                throw ValidationException::withMessages([
                    'auction_item' => 'Item is already sold.',
                ]);
            }

            $highest = $lockedItem->bids()
                ->orderByDesc('amount')
                ->orderByDesc('created_at')
                ->first();

            if (! $highest) {
                throw ValidationException::withMessages([
                    'auction_item' => 'No bids found for this item.',
                ]);
            }

            $lockedItem->sold_at = now();
            $lockedItem->sold_bid_id = $highest->id;
            $lockedItem->save();

            return $highest;
        });

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl !== '' && $botToken !== '') {
            try {
                $response = Http::timeout((int) config('services.bot.http_timeout', 10))
                    ->acceptJson()
                    ->withHeaders(['X-Bot-Token' => $botToken])
                    ->post(rtrim($botUrl, '/').'/auction-item-sold', [
                        'auction_item_id' => $auctionItem->id,
                        'winner_discord_id' => $highestBid->bidder_discord_id,
                    ]);

                if (! $response->ok()) {
                    Log::warning('Auction finalize bot update failed.', [
                        'auction_item_id' => $auctionItem->id,
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                }
            } catch (\Throwable $error) {
                Log::warning('Auction finalize bot unreachable.', [
                    'auction_item_id' => $auctionItem->id,
                    'error' => $error->getMessage(),
                ]);
            }
        }

        return redirect()->back();
    }
}
