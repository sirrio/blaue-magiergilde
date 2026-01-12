<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Http\Requests\Backstock\UpdateBackstockSettingRequest;
use App\Models\BackstockSetting;
use Illuminate\Http\JsonResponse;

class BackstockSettingController extends Controller
{
    public function __invoke(UpdateBackstockSettingRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $settings = BackstockSetting::current();
        $settings->update($payload);

        return response()->json([
            'status' => 'saved',
            'backstock_settings' => $settings->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
                'last_post_channel_id',
            ]),
        ]);
    }
}
