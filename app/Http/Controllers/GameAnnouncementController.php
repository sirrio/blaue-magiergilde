<?php

namespace App\Http\Controllers;

use App\Models\GameAnnouncement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GameAnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        return $this->renderList($request, 'upcoming');
    }

    public function archive(Request $request): Response
    {
        return $this->renderList($request, 'archive');
    }

    private function renderList(Request $request, string $mode): Response
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $perPage = $mode === 'archive' ? 20 : 200;

        $now = now();

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
            ->when($mode === 'upcoming', function (Builder $query) use ($now): void {
                $query->where(function (Builder $sub) use ($now): void {
                    $sub->whereNull('starts_at')->orWhere('starts_at', '>=', $now);
                })->orderBy('starts_at');
            })
            ->when($mode === 'archive', function (Builder $query) use ($now): void {
                $query->where('starts_at', '<', $now)->orderByDesc('starts_at');
            })
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
            'mode' => $mode,
            'pagination' => [
                'currentPage' => $gamesPaginator->currentPage(),
                'lastPage' => $gamesPaginator->lastPage(),
                'perPage' => $gamesPaginator->perPage(),
                'total' => $gamesPaginator->total(),
                'hasMorePages' => $gamesPaginator->hasMorePages(),
            ],
            'lastSyncedAt' => GameAnnouncement::query()->max('updated_at'),
        ]);
    }
}
