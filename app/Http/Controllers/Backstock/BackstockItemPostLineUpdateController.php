<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Models\BackstockItem;
use App\Services\BackstockPostService;
use Illuminate\Http\JsonResponse;

class BackstockItemPostLineUpdateController extends Controller
{
    public function __invoke(BackstockItem $backstockItem, BackstockPostService $backstockPostService): JsonResponse
    {
        $result = $backstockPostService->updateLine($backstockItem->id);
        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'error' => (string) ($result['error'] ?? 'Backstock line could not be updated.'),
            ], (int) ($result['status'] ?? 500));
        }

        return response()->json([
            'status' => 'updated',
        ]);
    }
}
