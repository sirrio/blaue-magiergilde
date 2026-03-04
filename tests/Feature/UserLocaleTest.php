<?php

use App\Models\User;

it('persists a user locale', function () {
    $user = User::factory()->create([
        'locale' => 'en',
    ]);

    expect($user->fresh()->locale)->toBe('en');
});

it('allows a null user locale', function () {
    $user = User::factory()->create([
        'locale' => null,
    ]);

    expect($user->fresh()->locale)->toBeNull();
});
