<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Models\AuctionItem;
use App\Services\AuctionPostService;
use Illuminate\Http\JsonResponse;

class AuctionItemPostLineUpdateController extends Controller
{
    public function __invoke(AuctionItem $auctionItem, AuctionPostService $auctionPostService): JsonResponse
    {
        $result = $auctionPostService->updateLine($auctionItem->id);
        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'error' => (string) ($result['error'] ?? 'Auction line could not be updated.'),
            ], (int) ($result['status'] ?? 500));
        }

        return response()->json([
            'status' => 'updated',
        ]);
    }
}
