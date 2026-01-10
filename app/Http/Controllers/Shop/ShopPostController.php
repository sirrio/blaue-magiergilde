<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\PostShopRequest;
use App\Models\Shop;
use App\Services\ShopPostService;
use Illuminate\Http\JsonResponse;

class ShopPostController extends Controller
{
    public function __invoke(PostShopRequest $request, Shop $shop, ShopPostService $service): JsonResponse
    {
        $channelId = $request->validated()['channel_id'];
        $result = $service->post($shop, $channelId);

        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'error' => $result['error'] ?? 'Bot request failed.',
            ], $result['status'] ?? 500);
        }

        return response()->json([
            'status' => 'posted',
            'shop_id' => $shop->id,
        ]);
    }
}
