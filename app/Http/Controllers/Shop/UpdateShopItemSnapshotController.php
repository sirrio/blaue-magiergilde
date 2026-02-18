<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\UpdateShopItemSnapshotRequest;
use App\Models\ShopItem;
use Illuminate\Http\RedirectResponse;

class UpdateShopItemSnapshotController extends Controller
{
    public function __invoke(UpdateShopItemSnapshotRequest $request, ShopItem $shopItem): RedirectResponse
    {
        $payload = $request->validated();
        $name = trim((string) $payload['name']);
        $url = trim((string) ($payload['url'] ?? ''));
        $cost = trim((string) ($payload['cost'] ?? ''));
        $notes = trim((string) ($payload['notes'] ?? ''));
        $nextUrl = $url === '' ? null : $url;
        $nextCost = $cost === '' ? null : $cost;

        $itemSnapshotChanged =
            (string) ($shopItem->item_name ?? '') !== $name
            || (string) ($shopItem->item_url ?? '') !== (string) ($nextUrl ?? '')
            || (string) ($shopItem->item_cost ?? '') !== (string) ($nextCost ?? '')
            || (string) ($shopItem->item_rarity ?? '') !== (string) $payload['rarity']
            || (string) ($shopItem->item_type ?? '') !== (string) $payload['type'];

        $shopItem->item_name = $name;
        $shopItem->item_url = $nextUrl;
        $shopItem->item_cost = $nextCost;
        $shopItem->item_rarity = $payload['rarity'];
        $shopItem->item_type = $payload['type'];
        $shopItem->notes = $notes === '' ? null : $notes;

        if ($itemSnapshotChanged) {
            $shopItem->snapshot_custom = true;
        }

        $shopItem->save();

        return redirect()->back();
    }
}
