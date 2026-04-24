<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\Downtime;
use App\Support\CharacterAuditTrail;
use App\Support\LevelProgression;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function requiredBubblesForLevel(int $level): int
{
    return LevelProgression::bubblesRequiredForLevel($level);
}

test('it calculates faction ranks based on level, downtime, and adventures', function (int $level, int $adventures, int $downtime, int $expectedRank) {
    $character = Character::factory()->create([
        'faction' => 'heiler',
        'is_filler' => false,
        'start_tier' => 'bt',
    ]);

    $trail = app(CharacterAuditTrail::class);
    $bubbles = requiredBubblesForLevel($level);
    if ($bubbles > 0) {
        $trail->record($character, 'dm_bubbles.granted', delta: [
            'bubbles' => $bubbles,
            'dm_bubbles' => $bubbles,
        ]);
    }

    Adventure::factory()
        ->count($adventures)
        ->for($character)
        ->state([
            'duration' => 0,
            'has_additional_bubble' => false,
        ])
        ->create();

    if ($downtime > 0) {
        $downtimeRow = Downtime::factory()
            ->for($character)
            ->state([
                'duration' => $downtime,
                'type' => 'faction',
            ])
            ->create();

        $trail->record($character, 'downtime.created', delta: [
            'downtime_seconds' => $downtime,
        ], metadata: ['type' => 'faction'], subject: $downtimeRow);
    }

    $trail->record($character, 'test.snapshot', metadata: ['hidden_from_history' => true]);

    expect($character->fresh('latestAuditSnapshot')->faction_rank)->toBe($expectedRank);
})->with([
    'rank 0 for below LT' => [4, 0, 0, 0],
    'rank 1 for guild member without 10 adventures' => [5, 0, 0, 1],
    'rank 2 after 10 adventures' => [6, 10, 0, 2],
    'rank 3 with level 9 and 100 hours downtime' => [9, 10, 360000, 3],
    'rank 4 with level 14 and 100 hours downtime' => [14, 10, 360000, 4],
    'rank 5 with level 18 and 500 hours downtime' => [18, 10, 1800000, 5],
]);
