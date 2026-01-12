<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Backstock\PostBackstockRequest;
use App\Services\BackstockPostService;
use Illuminate\Http\JsonResponse;

class BackstockPostController extends Controller
{
    public function __invoke(PostBackstockRequest $request, BackstockPostService $service): JsonResponse
    {
        $channelId = $request->validated()['channel_id'];
        $result = $service->post($channelId);

        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'error' => $result['error'] ?? 'Bot request failed.',
            ], $result['status'] ?? 500);
        }

        return response()->json([
            'status' => 'posted',
        ]);
    }
}
