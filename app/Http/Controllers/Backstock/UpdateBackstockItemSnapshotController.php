<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Backstock\UpdateBackstockItemSnapshotRequest;
use App\Models\BackstockItem;
use Illuminate\Http\RedirectResponse;

class UpdateBackstockItemSnapshotController extends Controller
{
    public function __invoke(UpdateBackstockItemSnapshotRequest $request, BackstockItem $backstockItem): RedirectResponse
    {
        $payload = $request->validated();
        $name = trim((string) $payload['name']);
        $url = trim((string) ($payload['url'] ?? ''));
        $cost = trim((string) ($payload['cost'] ?? ''));

        $backstockItem->item_name = $name;
        $backstockItem->item_url = $url === '' ? null : $url;
        $backstockItem->item_cost = $cost === '' ? null : $cost;
        $backstockItem->item_rarity = $payload['rarity'];
        $backstockItem->item_type = $payload['type'];
        $backstockItem->snapshot_custom = true;
        $backstockItem->save();

        return redirect()->back();
    }
}
