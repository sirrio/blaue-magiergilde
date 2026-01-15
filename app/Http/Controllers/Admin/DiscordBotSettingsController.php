<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDiscordBotSettingsRequest;
use App\Models\DiscordBotSetting;
use Illuminate\Http\RedirectResponse;

class DiscordBotSettingsController extends Controller
{
    public function update(UpdateDiscordBotSettingsRequest $request): RedirectResponse
    {
        $raw = (string) ($request->validated()['owner_ids'] ?? '');

        $ownerIds = collect(explode(',', $raw))
            ->map(fn ($id) => trim($id))
            ->filter(fn (string $id) => preg_match('/^[0-9]{5,}$/', $id))
            ->values()
            ->all();

        DiscordBotSetting::current()->update([
            'owner_ids' => $ownerIds,
        ]);

        return redirect()->back();
    }
}
