<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\PostShopRequest;
use App\Jobs\ProcessShopOperationJob;
use App\Models\ShopOperation;
use Illuminate\Http\JsonResponse;

class ShopPostController extends Controller
{
    public function __invoke(PostShopRequest $request): JsonResponse
    {
        $channelId = $request->validated()['channel_id'] ?? null;
        $operation = ShopOperation::query()->create([
            'action' => ShopOperation::ACTION_PUBLISH_DRAFT,
            'status' => ShopOperation::STATUS_PENDING,
            'step' => ShopOperation::STATUS_PENDING,
            'channel_id' => $channelId,
            'user_id' => $request->user()?->id,
        ]);

        try {
            ProcessShopOperationJob::dispatchForOperation($operation);
        } catch (\Throwable $error) {
            $operation->status = ShopOperation::STATUS_FAILED;
            $operation->step = ShopOperation::STATUS_FAILED;
            $operation->error = 'Queue dispatch failed. Start a queue worker and try again. '.$error->getMessage();
            $operation->finished_at = now();
            $operation->save();

            return response()->json([
                'error' => 'Shop operation could not be queued.',
                'operation' => $operation->only([
                    'id',
                    'action',
                    'status',
                    'step',
                    'error',
                    'created_at',
                ]),
            ], 500);
        }

        return response()->json([
            'status' => 'started',
            'operation' => $operation->only([
                'id',
                'action',
                'status',
                'step',
                'created_at',
            ]),
        ], 202);
    }
}
