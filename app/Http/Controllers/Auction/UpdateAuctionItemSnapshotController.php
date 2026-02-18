<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\UpdateAuctionItemSnapshotRequest;
use App\Models\AuctionItem;
use Illuminate\Http\RedirectResponse;

class UpdateAuctionItemSnapshotController extends Controller
{
    public function __invoke(UpdateAuctionItemSnapshotRequest $request, AuctionItem $auctionItem): RedirectResponse
    {
        $payload = $request->validated();
        $name = trim((string) $payload['name']);
        $url = trim((string) ($payload['url'] ?? ''));
        $cost = trim((string) ($payload['cost'] ?? ''));
        $notes = trim((string) ($payload['notes'] ?? ''));
        $repairCurrent = $payload['repair_current'] ?? null;
        $repairMax = $payload['repair_max'] ?? null;
        $nextUrl = $url === '' ? null : $url;
        $nextCost = $cost === '' ? null : $cost;

        $itemSnapshotChanged =
            (string) ($auctionItem->item_name ?? '') !== $name
            || (string) ($auctionItem->item_url ?? '') !== (string) ($nextUrl ?? '')
            || (string) ($auctionItem->item_cost ?? '') !== (string) ($nextCost ?? '')
            || (string) ($auctionItem->item_rarity ?? '') !== (string) $payload['rarity']
            || (string) ($auctionItem->item_type ?? '') !== (string) $payload['type'];

        $auctionItem->item_name = $name;
        $auctionItem->item_url = $nextUrl;
        $auctionItem->item_cost = $nextCost;
        $auctionItem->item_rarity = $payload['rarity'];
        $auctionItem->item_type = $payload['type'];
        $auctionItem->notes = $notes === '' ? null : $notes;
        $auctionItem->repair_current = $repairCurrent === '' ? null : $repairCurrent;
        $auctionItem->repair_max = $repairMax === '' ? null : $repairMax;

        if ($itemSnapshotChanged) {
            $auctionItem->snapshot_custom = true;
        }

        $auctionItem->save();

        return redirect()->back();
    }
}
