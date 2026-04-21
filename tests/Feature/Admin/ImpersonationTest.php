<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('redirects to characters after starting impersonation', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($admin)
        ->post(route('admin.impersonate.take', $user))
        ->assertRedirect(route('characters.index', absolute: false));
});

it('redirects to characters after leaving impersonation', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post(route('impersonate.leave'))
        ->assertRedirect(route('characters.index', absolute: false));
});
