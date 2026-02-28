<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Backstock\StoreBackstockItemRequest;
use App\Models\BackstockItem;
use App\Models\Item;
use App\Support\ItemCostResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class BackstockItemController extends Controller
{
    public function store(StoreBackstockItemRequest $request): RedirectResponse
    {
        $payload = $request->validated();
        $notes = isset($payload['notes']) ? trim((string) $payload['notes']) : '';
        $payload['notes'] = $notes === '' ? null : $notes;

        $item = Item::query()
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type'])
            ->with('mundaneVariants:id,name,slug,category,cost_gp,is_placeholder,sort_order')
            ->find($payload['item_id']);

        $payload['item_name'] = $item?->name;
        $payload['item_url'] = $item?->url;
        $payload['item_cost'] = $item ? ItemCostResolver::resolveForItem($item) : null;
        $payload['item_rarity'] = $item?->rarity;
        $payload['item_type'] = $item?->type;
        $payload['snapshot_custom'] = false;

        BackstockItem::query()->create($payload);

        return redirect()->back();
    }

    public function destroy(BackstockItem $backstockItem): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user && $user->is_admin, 403);

        $backstockItem->delete();

        return redirect()->back();
    }
}
