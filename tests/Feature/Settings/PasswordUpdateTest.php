<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('password can be updated', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertRedirect('/settings/password');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

test('incorrect password is rejected', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertSessionHasErrors('current_password');
});

test('password can be set without current password when account has no password yet', function () {
    $user = User::factory()->create([
        'password' => null,
        'discord_id' => '123456789012345678',
    ]);

    $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertRedirect('/settings/password')
        ->assertSessionHasNoErrors();

    expect(Hash::check('new-password', (string) $user->refresh()->password))->toBeTrue();
});
