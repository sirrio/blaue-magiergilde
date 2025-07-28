<?php

use App\Models\Registration;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('allows guests to submit registrations', function () {
    $response = $this->post('/registrations', [
        'link' => 'https://example.com/sheet',
        'tier' => 'bt',
    ]);

    $response->assertRedirect();
    expect(Registration::count())->toBe(1);
});

it('admins can view the registration list', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->get('/registrations')
        ->assertOk();
});

it('admins can approve a registration', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $registration = Registration::factory()->create();

    $this->actingAs($admin)
        ->put('/registrations/' . $registration->id, [
            'approved_at' => now()->toDateTimeString(),
        ])
        ->assertRedirect();

    $registration->refresh();
    expect($registration->approved_at)->not->toBeNull();
});
