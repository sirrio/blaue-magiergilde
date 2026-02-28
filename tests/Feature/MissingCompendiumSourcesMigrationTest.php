<?php

use App\Models\Source;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('missing compendium sources are seeded by migration', function () {
    expect(Source::query()->where('shortcode', 'TCOE')->value('name'))
        ->toBe("Tasha's Cauldron of Everything")
        ->and(Source::query()->where('shortcode', 'WGE')->value('name'))
        ->toBe("Wayfinder's Guide to Eberron")
        ->and(Source::query()->where('shortcode', 'FRAIF')->value('name'))
        ->toBe('Forgotten Realms: Adventures in Faerûn')
        ->and(Source::query()->where('shortcode', 'WDOTMM')->value('name'))
        ->toBe('Waterdeep: Dungeon of the Mad Mage')
        ->and(Source::query()->where('shortcode', 'GSB2')->value('name'))
        ->toBe("The Griffon's Saddlebag: Book Two")
        ->and(Source::query()->where('shortcode', 'DSDQ')->value('name'))
        ->toBe('Dragonlance: Shadow of the Dragon Queen');
});
