<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\UpdateShopSettingRequest;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;

class ShopSettingController extends Controller
{
    public function __invoke(UpdateShopSettingRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $settings = ShopSetting::current();
        $settings->update($payload);

        return response()->json([
            'status' => 'saved',
            'shop_settings' => $settings->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
            ]),
        ]);
    }
}
