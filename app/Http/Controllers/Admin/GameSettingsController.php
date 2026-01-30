<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscordBotSetting;
use App\Models\GameAnnouncement;
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
        $connection = GameAnnouncement::query()->getConnection();
        $driver = $connection->getDriverName();
        $monthExpression = $driver === 'sqlite'
            ? "strftime('%Y-%m', starts_at)"
            : "DATE_FORMAT(starts_at, '%Y-%m')";
        $rows = GameAnnouncement::query()
            ->selectRaw("{$monthExpression} as month, LOWER(tier) as tier, COUNT(*) as total")
            ->whereNotNull('starts_at')
            ->groupBy('month', 'tier')
            ->orderByDesc('month')
            ->get();

        $monthly = $rows
            ->groupBy('month')
            ->map(function ($group, string $month) use ($tierLabels) {
                $counts = array_fill_keys([...$tierLabels, 'unknown'], 0);

                foreach ($group as $row) {
                    $tier = in_array($row->tier, $tierLabels, true) ? $row->tier : 'unknown';
                    $counts[$tier] = (int) $row->total;
                }

                $total = array_sum($counts);

                return [
                    'month' => $month,
                    'counts' => $counts,
                    'total' => $total,
                ];
            })
            ->values();

        $totals = array_fill_keys([...$tierLabels, 'unknown'], 0);
        foreach ($rows as $row) {
            $tier = in_array($row->tier, $tierLabels, true) ? $row->tier : 'unknown';
            $totals[$tier] += (int) $row->total;
        }
        $totals['total'] = array_sum($totals);

        return Inertia::render('admin/games', [
            'discordBotSettings' => [
                'games_channel_id' => $settings->games_channel_id,
                'games_channel_name' => $settings->games_channel_name,
                'games_channel_guild_id' => $settings->games_channel_guild_id,
                'games_scan_years' => $settings->games_scan_years ?? 10,
            ],
            'stats' => [
                'monthly' => $monthly,
                'totals' => $totals,
            ],
        ]);
    }
}
