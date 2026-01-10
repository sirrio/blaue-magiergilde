<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\UpdateVoiceSettingRequest;
use App\Models\VoiceSetting;
use Illuminate\Http\RedirectResponse;

class VoiceSettingController extends Controller
{
    /**
     * Update the global voice settings.
     */
    public function __invoke(UpdateVoiceSettingRequest $request): RedirectResponse
    {
        $settings = VoiceSetting::current();

        $settings->voice_channel_id = $request->voice_channel_id;
        $settings->voice_channel_name = $request->voice_channel_name;
        $settings->voice_channel_type = $request->voice_channel_type;
        $settings->voice_channel_guild_id = $request->voice_channel_guild_id;
        $settings->voice_channel_is_thread = $request->voice_channel_is_thread;

        $settings->save();

        return redirect()->back();
    }
}
