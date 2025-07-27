<?php

use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $this->get('/characters')->assertRedirect('/login');
});

test('authenticated users can visit the characters index', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/characters')->assertOk();
});