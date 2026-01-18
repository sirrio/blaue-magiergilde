<?php

use App\Models\Adventure;

it('defaults adventures to non-pseudo', function () {
    $adventure = Adventure::factory()->create();

    expect($adventure->is_pseudo)->toBeFalse();
});

it('allows adventures to be flagged as pseudo', function () {
    $adventure = Adventure::factory()->create([
        'is_pseudo' => true,
    ]);

    expect($adventure->is_pseudo)->toBeTrue();
});
