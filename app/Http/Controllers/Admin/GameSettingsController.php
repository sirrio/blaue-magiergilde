<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBotSetting;
use Inertia\Inertia;
use Inertia\Response;

class GameSettingsController extends Controller
{
    public function index(): Response
    {
        $user = request()->user();

        abort_unless($user && $user->is_admin, 403);

        $settings = DiscordBotSetting::current();

        return Inertia::render('admin/games', [
            'discordBotSettings' => [
                'games_channel_id' => $settings->games_channel_id,
                'games_channel_name' => $settings->games_channel_name,
                'games_channel_guild_id' => $settings->games_channel_guild_id,
            ],
        ]);
    }
}
