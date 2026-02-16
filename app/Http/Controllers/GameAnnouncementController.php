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
        $perPageOptions = [50, 100, 250];
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'in:'.implode(',', $perPageOptions)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $perPage = (int) ($validated['per_page'] ?? 100);

        $gamesPaginator = GameAnnouncement::query()
            ->select([
                'id',
                'discord_channel_id',
                'discord_guild_id',
                'discord_message_id',
                'discord_author_id',
                'discord_author_name',
                'discord_author_avatar_url',
                'title',
                'content',
                'tier',
                'starts_at',
                'posted_at',
                'confidence',
            ])
            ->orderByDesc('starts_at')
            ->orderByDesc('posted_at')
            ->paginate($perPage)
            ->withQueryString();

        $games = $gamesPaginator
            ->getCollection()
            ->map(static function (GameAnnouncement $game): array {
                return [
                    'id' => $game->id,
                    'discord_channel_id' => $game->discord_channel_id,
                    'discord_guild_id' => $game->discord_guild_id,
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
            'pagination' => [
                'currentPage' => $gamesPaginator->currentPage(),
                'lastPage' => $gamesPaginator->lastPage(),
                'perPage' => $gamesPaginator->perPage(),
                'total' => $gamesPaginator->total(),
                'hasMorePages' => $gamesPaginator->hasMorePages(),
            ],
            'perPageOptions' => $perPageOptions,
            'lastSyncedAt' => GameAnnouncement::query()->max('updated_at'),
        ]);
    }
}
