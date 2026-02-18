<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\ShopOperation;
use Illuminate\Http\JsonResponse;

class ShopOperationStatusController extends Controller
{
    public function __invoke(ShopOperation $shopOperation): JsonResponse
    {
        return response()->json([
            'operation' => $shopOperation->only([
                'id',
                'action',
                'status',
                'step',
                'channel_id',
                'shop_id',
                'result_shop_id',
                'current_shop_id',
                'draft_shop_id',
                'error',
                'meta',
                'started_at',
                'finished_at',
                'created_at',
                'updated_at',
            ]),
        ]);
    }
}
