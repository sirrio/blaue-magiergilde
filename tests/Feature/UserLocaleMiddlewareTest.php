<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shares the authenticated user locale with inertia pages', function () {
    $user = User::factory()->create([
        'locale' => 'en',
    ]);

    $this->actingAs($user)
        ->get(route('characters.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale', 'en')
            ->where('availableLocales', ['de', 'en']));
});

it('falls back to german when the user has no locale configured', function () {
    $user = User::factory()->create([
        'locale' => null,
    ]);

    $this->actingAs($user)
        ->get(route('characters.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale', 'de')
            ->where('availableLocales', ['de', 'en']));
});
