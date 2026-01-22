<?php

namespace App\Http\Controllers;

use App\Models\GameAnnouncement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GameAnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        $games = GameAnnouncement::query()
            ->orderByDesc('starts_at')
            ->orderByDesc('posted_at')
            ->get()
            ->map(static function (GameAnnouncement $game): array {
                return [
                    'id' => $game->id,
                    'discord_channel_id' => $game->discord_channel_id,
                    'discord_message_id' => $game->discord_message_id,
                    'discord_author_id' => $game->discord_author_id,
                    'discord_author_name' => $game->discord_author_name,
                    'discord_author_avatar_url' => $game->discord_author_avatar_url,
                    'title' => $game->title,
                    'content' => $game->content,
                    'tier' => $game->tier,
                    'starts_at' => $game->getRawOriginal('starts_at'),
                    'posted_at' => $game->getRawOriginal('posted_at'),
                    'confidence' => $game->confidence,
                ];
            })
            ->values();

        return Inertia::render('games/index', [
            'games' => $games,
            'lastSyncedAt' => GameAnnouncement::query()->max('updated_at'),
        ]);
    }
}
