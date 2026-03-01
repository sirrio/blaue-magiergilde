<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('shares bot channel override state with inertia pages', function () {
    config()->set('services.bot.channel_override_id', '123456789012345678');

    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('characters.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('botChannelOverride.active', true)
            ->where('botChannelOverride.channel_id', '123456789012345678'));
});
