<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Backstock\StoreBackstockItemRequest;
use App\Models\BackstockItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class BackstockItemController extends Controller
{
    public function store(StoreBackstockItemRequest $request): RedirectResponse
    {
        $payload = $request->validated();
        $notes = isset($payload['notes']) ? trim((string) $payload['notes']) : '';
        $payload['notes'] = $notes === '' ? null : $notes;

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
