<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopItem;
use App\Services\ShopPostService;
use Illuminate\Http\JsonResponse;

class ShopItemPostLineUpdateController extends Controller
{
    public function __invoke(ShopItem $shopItem, ShopPostService $shopPostService): JsonResponse
    {
        $result = $shopPostService->updateLine($shopItem->id);
        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'error' => (string) ($result['error'] ?? 'Shop line could not be updated.'),
            ], (int) ($result['status'] ?? 500));
        }

        return response()->json([
            'status' => 'updated',
        ]);
    }
}
