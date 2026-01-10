<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Services\ShopPostService;
use Illuminate\Http\JsonResponse;

class ShopUpdatePostController extends Controller
{
    public function __invoke(Shop $shop, ShopPostService $service): JsonResponse
    {
        $result = $service->update($shop);

        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'error' => $result['error'] ?? 'Bot request failed.',
            ], $result['status'] ?? 500);
        }

        return response()->json([
            'status' => 'updated',
            'shop_id' => $shop->id,
        ]);
    }
}
