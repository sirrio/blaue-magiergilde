<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('reset password link screen is unavailable', function () {
    $response = $this->get('/forgot-password');

    $response->assertNotFound();
});

test('reset password link cannot be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $response = $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertNothingSent();
    $response->assertNotFound();
});

test('reset password screen is unavailable', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertNothingSent();

    $response = $this->get('/reset-password/dummy');

    $response->assertNotFound();
});

test('password cannot be reset with token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertNothingSent();

    $response = $this->post('/reset-password', [
        'token' => 'dummy',
        'email' => $user->email,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertNotFound();
});
