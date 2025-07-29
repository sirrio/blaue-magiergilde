<?php

use App\Models\Registration;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

it('allows guests to submit registrations', function () {
    $response = $this->post('/registrations', [
        'character_name' => 'Hero',
        'character_url' => 'https://example.com/sheet',
        'start_tier' => 'bt',
        'tier' => 'bt',
        'discord_name' => 'Tester#1234',
        'discord_id' => 12345,
        'notes' => 'First session',
    ]);

    $response->assertRedirect();
    expect(Registration::count())->toBe(1);
    $stored = Registration::first();
    expect($stored->notes)->toBe('First session');
    expect($stored->start_tier)->toBe('bt');
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
            'status' => 'approved',
        ])
        ->assertRedirect();

    $registration->refresh();
    expect($registration->status)->toBe('approved');
});
