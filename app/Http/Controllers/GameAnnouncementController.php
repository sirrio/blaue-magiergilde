<?php

namespace App\Http\Controllers;

use App\Models\GameAnnouncement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class GameAnnouncementController extends Controller
{
    public function index(Request $request): Response
    {
        $games = GameAnnouncement::query()
            ->orderByDesc('starts_at')
            ->orderByDesc('posted_at')
            ->get();

        return Inertia::render('games/index', [
            'games' => $games,
            'canSync' => (bool) ($request->user()?->is_admin),
            'lastSyncedAt' => GameAnnouncement::query()->max('updated_at'),
        ]);
    }

    public function sync(Request $request): HttpResponse
    {
        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));
        $channelId = trim((string) config('services.bot.games_channel_id', ''));
        $autoSync = $request->headers->has('X-Games-Auto-Sync');

        if ($botUrl === '' || $botToken === '' || $channelId === '') {
            if ($autoSync) {
                return response()->json(['error' => 'Bot is not configured for game sync.'], 422);
            }

            return back()->with('error', 'Bot is not configured for game sync.');
        }

        $since = Carbon::now()->subMonths(6)->toIso8601String();
        $timeout = max(1, (int) config('services.bot.http_timeout', 10));

        $response = Http::timeout($timeout)
            ->withHeaders(['X-Bot-Token' => $botToken])
            ->post(rtrim($botUrl, '/').'/discord-games', [
                'channel_id' => $channelId,
                'since' => $since,
            ]);

        if (! $response->successful()) {
            if ($autoSync) {
                return response()->json(['error' => 'Bot request failed.'], 502);
            }

            return back()->with('error', 'Bot request failed.');
        }

        $payload = $response->json();
        $games = is_array($payload['games'] ?? null) ? $payload['games'] : null;

        if ($games === null) {
            if ($autoSync) {
                return response()->json(['error' => 'Invalid bot response.'], 502);
            }

            return back()->with('error', 'Invalid bot response.');
        }

        $rows = [];
        foreach ($games as $game) {
            if (! is_array($game) || empty($game['discord_message_id'])) {
                continue;
            }

            $startsAt = $this->normalizeDate($game['starts_at'] ?? null);
            $postedAt = $this->normalizeDate($game['posted_at'] ?? null);

            $rows[] = [
                'discord_channel_id' => (string) ($game['discord_channel_id'] ?? $channelId),
                'discord_message_id' => (string) $game['discord_message_id'],
                'discord_author_id' => $game['discord_author_id'] ?? null,
                'discord_author_name' => $game['discord_author_name'] ?? null,
                'title' => $game['title'] ?? null,
                'content' => $game['content'] ?? null,
                'tier' => $game['tier'] ?? null,
                'starts_at' => $startsAt,
                'posted_at' => $postedAt,
                'confidence' => $game['confidence'] ?? 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if ($rows !== []) {
            GameAnnouncement::query()->upsert(
                $rows,
                ['discord_message_id'],
                [
                    'discord_channel_id',
                    'discord_author_id',
                    'discord_author_name',
                    'title',
                    'content',
                    'tier',
                    'starts_at',
                    'posted_at',
                    'confidence',
                    'updated_at',
                ],
            );
        }

        if ($autoSync) {
            return response()->json(['status' => 'synced', 'count' => count($rows)]);
        }

        return back()->with('success', 'Discord games synced.');
    }

    private function normalizeDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (\Throwable) {
            return null;
        }
    }
}
