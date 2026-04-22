<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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
    'admin.character-classes.index',
    'admin.mundane-item-variants.index',
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
    'admin.character-approvals.index',
    'admin.rooms.index',
]);

it('serves admin compendium shortcuts through the shared compendium pages', function (string $routeName, string $expectedComponent) {
    $user = User::factory()->create(['is_admin' => true]);

    $this->actingAs($user)
        ->get(route($routeName))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($expectedComponent));
})->with([
    ['admin.items.index', 'item/index'],
    ['admin.spells.index', 'spell/index'],
    ['admin.character-classes.index', 'character-class/index'],
    ['admin.mundane-item-variants.index', 'mundane-item-variant/index'],
]);
