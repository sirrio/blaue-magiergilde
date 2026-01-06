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

        $settings->save();

        return redirect()->back();
    }
}
