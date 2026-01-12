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

        $shopItem->item_name = $name;
        $shopItem->item_url = $url === '' ? null : $url;
        $shopItem->item_cost = $cost === '' ? null : $cost;
        $shopItem->item_rarity = $payload['rarity'];
        $shopItem->item_type = $payload['type'];
        $shopItem->snapshot_custom = true;
        $shopItem->save();

        return redirect()->back();
    }
}
