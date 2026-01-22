<?php

it('uses theme-aware spell school colors', function () {
    $contents = file_get_contents(base_path('resources/js/pages/spell/spell-row.tsx'));

    expect($contents)->not->toContain('text-[#');
});

it('uses theme-aware inertia progress color', function () {
    $contents = file_get_contents(base_path('resources/js/app.tsx'));

    expect($contents)->not->toContain("color: '#");
    expect($contents)->not->toContain("color: '#4B5563'");
});
