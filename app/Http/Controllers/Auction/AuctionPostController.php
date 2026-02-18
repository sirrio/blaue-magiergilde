<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\PostAuctionRequest;
use App\Jobs\ProcessBotOperationJob;
use App\Models\Auction;
use App\Models\BotOperation;
use Illuminate\Http\JsonResponse;

class AuctionPostController extends Controller
{
    public function __invoke(PostAuctionRequest $request, Auction $auction): JsonResponse
    {
        $channelId = $request->validated()['channel_id'];
        $operation = BotOperation::query()->create([
            'resource' => BotOperation::RESOURCE_AUCTION,
            'resource_id' => $auction->id,
            'action' => BotOperation::ACTION_POST_AUCTION,
            'status' => BotOperation::STATUS_PENDING,
            'step' => BotOperation::STATUS_PENDING,
            'channel_id' => $channelId,
            'user_id' => $request->user()?->id,
        ]);

        try {
            ProcessBotOperationJob::dispatchForOperation($operation);
        } catch (\Throwable $error) {
            $operation->status = BotOperation::STATUS_FAILED;
            $operation->step = BotOperation::STATUS_FAILED;
            $operation->error = 'Queue dispatch failed. Start a queue worker and try again. '.$error->getMessage();
            $operation->finished_at = now();
            $operation->save();

            return response()->json([
                'error' => 'Auction operation could not be queued.',
                'operation' => $operation->only([
                    'id',
                    'resource',
                    'resource_id',
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
                'resource',
                'resource_id',
                'action',
                'status',
                'step',
                'created_at',
            ]),
        ], 202);
    }
}
