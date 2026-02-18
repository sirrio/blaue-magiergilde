<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionBidRequest;
use App\Models\Auction;
use App\Models\AuctionBid;
use App\Models\AuctionItem;
use App\Models\AuctionSetting;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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

    private function getStartingBid(AuctionItem $auctionItem, int $step): int
    {
        $repairCurrent = (int) ($auctionItem->repair_current ?? 0);
        $halfRepair = (int) ceil($repairCurrent / 2);

        return (int) (ceil($halfRepair / $step) * $step);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAuctionBidRequest $request, AuctionItem $auctionItem): RedirectResponse
    {
        $createdBid = null;

        try {
            DB::transaction(function () use ($request, $auctionItem, &$createdBid): void {
                $lockedAuction = Auction::query()
                    ->lockForUpdate()
                    ->findOrFail($auctionItem->auction_id);

                $lockedItem = AuctionItem::query()
                    ->with(['item', 'hiddenBids'])
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

                $step = $this->getBidStep($lockedItem->item);
                $startingBid = $this->getStartingBid($lockedItem, $step);
                $highestBid = (int) $lockedItem->bids()->max('amount');
                $minBid = $highestBid > 0
                    ? max($startingBid, $highestBid + $step)
                    : $startingBid;

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

                if (($amount - $startingBid) % $step !== 0) {
                    throw ValidationException::withMessages([
                        'amount' => "Bids must be in steps of {$step}.",
                    ]);
                }

                $createdBid = $lockedItem->bids()->create([
                    'bidder_name' => $request->bidder_name,
                    'bidder_discord_id' => $request->bidder_discord_id,
                    'amount' => $request->amount,
                    'created_by' => $request->user()->id,
                ]);
            });
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        if ($createdBid instanceof AuctionBid) {
            $this->notifyVoiceHighestBid($auctionItem, $createdBid);
        }

        return redirect()->back();
    }

    /**
     * Remove the specified bid.
     */
    public function destroy(Request $request, AuctionBid $auctionBid): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $auctionItem = $auctionBid->auctionItem;
        $auctionBid->delete();

        if ($auctionItem) {
            $highestBid = AuctionBid::query()
                ->where('auction_item_id', $auctionItem->id)
                ->orderByDesc('amount')
                ->orderByDesc('created_at')
                ->first();

            $this->notifyVoiceHighestBid($auctionItem, $highestBid);
        }

        return redirect()->back();
    }

    private function notifyVoiceHighestBid(AuctionItem $auctionItem, ?AuctionBid $highestBid): void
    {
        $settings = AuctionSetting::current();
        if (! $settings->voice_channel_id) {
            return;
        }

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));
        if ($botUrl === '' || $botToken === '') {
            return;
        }

        $payload = [
            'channel_id' => $settings->voice_channel_id,
            'auction_item_id' => $auctionItem->id,
            'clear' => $highestBid === null,
        ];

        if ($highestBid) {
            $payload['bidder_discord_id'] = $highestBid->bidder_discord_id;
            $payload['bidder_name'] = $highestBid->bidder_name;
            $payload['amount'] = $highestBid->amount;
        }

        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/auction-voice-bid', $payload);

            if (! $response->ok()) {
                Log::warning('Auction voice bid notify failed', [
                    'auction_item_id' => $auctionItem->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $error) {
            Log::warning('Auction voice bid notify exception', [
                'auction_item_id' => $auctionItem->id,
                'error' => $error->getMessage(),
            ]);
        }
    }
}
