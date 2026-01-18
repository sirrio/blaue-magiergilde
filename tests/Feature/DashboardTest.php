<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $this->get('/characters')->assertRedirect('/login');
});

test('authenticated users can visit the characters index', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/characters')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('character/index')
            ->has('characters'));
});
