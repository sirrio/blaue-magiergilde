<?php

use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('email verification screen returns not found', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get('/verify-email');

    $response->assertNotFound();
});

test('email can not be verified', function () {
    $user = User::factory()->unverified()->create();

    $verificationUrl = '/verify-email/'.sha1($user->email);

    $response = $this->actingAs($user)->get($verificationUrl);
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    $response->assertNotFound();
});

test('email is not verified with invalid hash', function () {
    $user = User::factory()->unverified()->create();

    $verificationUrl = '/verify-email/'.sha1('wrong-email');

    $response = $this->actingAs($user)->get($verificationUrl);

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    $response->assertNotFound();
});
