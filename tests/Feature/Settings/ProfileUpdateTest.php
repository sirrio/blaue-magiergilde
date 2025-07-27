<?php

use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('profile page can be rendered', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response->assertRedirect(route('profile.edit', absolute: false));
    expect($user->refresh()->email)->toBe('test@example.com');
});

test('user can delete account via profile route', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete('/settings/profile', [
            'password' => 'password',
        ]);

    $response->assertRedirect('/');
    expect(User::find($user->id))->toBeNull();
});

test('incorrect password on delete is rejected', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/profile')
        ->delete('/settings/profile', [
            'password' => 'wrong-password',
        ]);

    $response->assertSessionHasErrors('password');
    expect($user->fresh())->not->toBeNull();
});
