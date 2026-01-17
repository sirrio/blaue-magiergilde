<?php

use App\Models\User;

it('blocks non-admin users from admin pages', function (string $routeName) {
    $user = User::factory()->create(['is_admin' => false]);

    $response = $this->actingAs($user)->get(route($routeName));

    $response->assertForbidden();
})->with([
    'admin.settings',
    'admin.shops.index',
    'admin.backstock.index',
    'admin.auctions.index',
    'admin.items.index',
    'admin.spells.index',
    'admin.character-approvals.index',
    'admin.rooms.index',
]);

it('allows admin users to access admin pages', function (string $routeName) {
    $user = User::factory()->create(['is_admin' => true]);

    $response = $this->actingAs($user)->get(route($routeName));

    $response->assertOk();
})->with([
    'admin.settings',
    'admin.shops.index',
    'admin.backstock.index',
    'admin.auctions.index',
    'admin.items.index',
    'admin.spells.index',
    'admin.character-approvals.index',
    'admin.rooms.index',
]);
