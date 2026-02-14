<?php

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'privacy_policy_accepted' => true,
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('characters.index', absolute: false));

    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'privacy_policy_accepted_version' => (int) config('legal.privacy_policy.version'),
    ]);
});

test('new users must accept the privacy policy to register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('privacy_policy_accepted');
    $this->assertGuest();
});
