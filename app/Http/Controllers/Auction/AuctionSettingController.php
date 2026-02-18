<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\UpdateAuctionSettingRequest;
use App\Models\AuctionSetting;
use Illuminate\Http\JsonResponse;

class AuctionSettingController extends Controller
{
    public function __invoke(UpdateAuctionSettingRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $settings = AuctionSetting::current();
        $settings->update($payload);

        return response()->json([
            'status' => 'saved',
            'auction_settings' => $settings->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
                'last_post_channel_id',
                'last_post_item_message_ids',
                'voice_channel_id',
                'voice_channel_name',
                'voice_channel_type',
                'voice_channel_guild_id',
                'voice_channel_is_thread',
            ]),
        ]);
    }
}
