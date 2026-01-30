<?php

use App\Models\GameAnnouncement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('shows game stats on the admin games page', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_admin' => true])->save();

    GameAnnouncement::factory()->create([
        'tier' => 'bt',
        'starts_at' => '2026-01-10 19:00:00',
        'discord_author_id' => '123',
        'discord_author_name' => 'Test GM',
    ]);
    GameAnnouncement::factory()->create([
        'tier' => 'ht',
        'starts_at' => '2026-01-15 20:00:00',
        'discord_author_id' => '123',
        'discord_author_name' => 'Test GM',
    ]);
    GameAnnouncement::factory()->create([
        'tier' => null,
        'starts_at' => '2025-12-20 19:00:00',
        'discord_author_id' => '456',
        'discord_author_name' => 'Other GM',
    ]);

    $response = $this->actingAs($admin)->get(route('admin.games'));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/games')
        ->where('discordBotSettings.games_scan_years', 10)
        ->has('stats.monthly', 2)
        ->where('stats.monthly.0.month', '2026-01')
        ->where('stats.monthly.0.counts.bt', 1)
        ->where('stats.monthly.0.counts.ht', 1)
        ->where('stats.monthly.1.month', '2025-12')
        ->where('stats.monthly.1.counts.unknown', 1)
        ->where('stats.totals.bt', 1)
        ->where('stats.totals.ht', 1)
        ->where('stats.totals.unknown', 1)
        ->where('stats.totals.total', 3)
        ->has('stats.gms', 2)
        ->where('stats.gms.0.discord_author_name', 'Test GM')
        ->where('stats.gms.0.total', 2)
    );
});
