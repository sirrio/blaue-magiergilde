<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBotSetting;
use App\Models\GameAnnouncement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GameSettingsController extends Controller
{
    public function index(): Response
    {
        $user = request()->user();

        abort_unless($user && $user->is_admin, 403);

        $settings = DiscordBotSetting::current();
        $tierLabels = ['bt', 'lt', 'ht', 'et'];
        $announcements = GameAnnouncement::query()
            ->whereNotNull('starts_at')
            ->get([
                'discord_author_id',
                'discord_author_name',
                'tier',
                'starts_at',
                'posted_at',
                'content',
            ]);

        $entries = $announcements->map(function (GameAnnouncement $announcement) {
            $authorKey = $announcement->discord_author_id
                ? 'id:'.$announcement->discord_author_id
                : ($announcement->discord_author_name ? 'name:'.$announcement->discord_author_name : 'unknown');
            $content = $announcement->content ?? '';
            $cancelled = (bool) preg_match(
                '/\b(abgesagt|abgesage|abgesagt|entfällt|faellt\s+aus|fällt\s+aus|cancel(?:led|ed))\b/ui',
                $content
            );

            return [
                'author_key' => $authorKey,
                'author_id' => $announcement->discord_author_id,
                'author_name' => $announcement->discord_author_name,
                'tier' => $announcement->tier ? strtolower((string) $announcement->tier) : 'unknown',
                'starts_at' => Carbon::parse($announcement->starts_at),
                'posted_at' => $announcement->posted_at ? Carbon::parse($announcement->posted_at) : null,
                'cancelled' => $cancelled,
            ];
        });

        $deduped = collect();
        $duplicateCount = 0;

        $entries->groupBy('author_key')->each(function ($group) use (&$deduped, &$duplicateCount) {
            $sorted = $group->sortBy(fn ($entry) => $entry['starts_at']->timestamp);
            $lastTime = null;
            $lastDate = null;

            foreach ($sorted as $entry) {
                $currentTime = $entry['starts_at'];
                $currentDate = $currentTime->toDateString();
                if ($lastTime && $lastDate === $currentDate && $currentTime->diffInMinutes($lastTime) < 180) {
                    $duplicateCount++;

                    continue;
                }
                $deduped->push($entry);
                $lastTime = $currentTime;
                $lastDate = $currentDate;
            }
        });

        $monthly = collect();
        $totals = array_fill_keys([...$tierLabels, 'unknown'], 0);
        $cancelledTotals = array_fill_keys([...$tierLabels, 'unknown'], 0);

        foreach ($deduped as $entry) {
            $month = $entry['starts_at']->format('Y-m');
            $tier = in_array($entry['tier'], $tierLabels, true) ? $entry['tier'] : 'unknown';

            if (! $monthly->has($month)) {
                $monthly->put($month, [
                    'month' => $month,
                    'counts' => array_fill_keys([...$tierLabels, 'unknown'], 0),
                    'cancelled' => array_fill_keys([...$tierLabels, 'unknown'], 0),
                ]);
            }

            $current = $monthly->get($month);

            if ($entry['cancelled']) {
                $current['cancelled'][$tier] += 1;
                $cancelledTotals[$tier] += 1;
                $monthly->put($month, $current);

                continue;
            }

            $current['counts'][$tier] += 1;
            $totals[$tier] += 1;
            $monthly->put($month, $current);
        }

        $monthly = $monthly
            ->values()
            ->map(function (array $row) {
                $row['total'] = array_sum($row['counts']);
                $row['cancelled_total'] = array_sum($row['cancelled']);

                return $row;
            })
            ->sortByDesc('month')
            ->values();

        $totals['total'] = array_sum($totals);
        $cancelledTotals['total'] = array_sum($cancelledTotals);

        $gmStats = $deduped
            ->groupBy('author_key')
            ->map(function ($group) {
                $first = $group->first();
                $cancelled = $group->filter(fn ($entry) => $entry['cancelled'])->count();

                return [
                    'discord_author_id' => $first['author_id'],
                    'discord_author_name' => $first['author_name'],
                    'total' => $group->count(),
                    'cancelled' => $cancelled,
                ];
            })
            ->sortByDesc('total')
            ->values();

        return Inertia::render('admin/games', [
            'discordBotSettings' => [
                'games_channel_id' => $settings->games_channel_id,
                'games_channel_name' => $settings->games_channel_name,
                'games_channel_guild_id' => $settings->games_channel_guild_id,
                'games_scan_years' => $settings->games_scan_years ?? 10,
                'games_scan_interval_minutes' => $settings->games_scan_interval_minutes ?? 60,
            ],
            'stats' => [
                'monthly' => $monthly,
                'totals' => $totals,
                'cancelled_totals' => $cancelledTotals,
                'duplicate_count' => $duplicateCount,
                'gms' => $gmStats,
            ],
        ]);
    }

    public function scan(): RedirectResponse
    {
        $user = request()->user();
        abort_unless($user && $user->is_admin, 403);

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            throw ValidationException::withMessages([
                'scan' => 'Bot HTTP is not configured.',
            ]);
        }

        try {
            $response = Http::timeout((int) config('services.bot.http_timeout', 10))
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/games-sync');
        } catch (\Throwable $error) {
            throw ValidationException::withMessages([
                'scan' => 'Bot is not reachable.',
            ]);
        }

        if (! $response->ok()) {
            throw ValidationException::withMessages([
                'scan' => 'Games scan failed.',
            ]);
        }

        return redirect()->back();
    }
}
