<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Models\BotOperation;
use Illuminate\Http\JsonResponse;

class BotOperationStatusController extends Controller
{
    public function __invoke(BotOperation $botOperation): JsonResponse
    {
        return response()->json([
            'operation' => $botOperation->only([
                'id',
                'resource',
                'resource_id',
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
