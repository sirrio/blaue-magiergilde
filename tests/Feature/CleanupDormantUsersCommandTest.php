<?php

use App\Models\Character;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('soft deletes only dormant non-admin users without non-deleted characters', function () {
    $dormant = User::factory()->create([
        'created_at' => now()->subMonths(7),
        'is_admin' => false,
    ]);
    $recent = User::factory()->create([
        'created_at' => now()->subMonths(2),
        'is_admin' => false,
    ]);
    $admin = User::factory()->create([
        'created_at' => now()->subMonths(7),
        'is_admin' => true,
    ]);
    $withCharacter = User::factory()->create([
        'created_at' => now()->subMonths(7),
        'is_admin' => false,
    ]);
    Character::factory()->for($withCharacter)->create([
        'guild_status' => 'draft',
    ]);

    $this->artisan('users:cleanup-dormant')
        ->expectsOutput('Soft-deleted 1 dormant user older than 6 months.')
        ->assertExitCode(0);

    expect($dormant->fresh())->trashed()->toBeTrue()
        ->and($recent->fresh())->trashed()->toBeFalse()
        ->and($admin->fresh())->trashed()->toBeFalse()
        ->and($withCharacter->fresh())->trashed()->toBeFalse();
});

it('supports dry run without deleting accounts', function () {
    $dormant = User::factory()->create([
        'created_at' => now()->subMonths(7),
        'is_admin' => false,
    ]);

    $this->artisan('users:cleanup-dormant --dry-run')
        ->expectsOutput('Dry run: 1 dormant user would be soft-deleted (older than 6 months).')
        ->assertExitCode(0);

    expect($dormant->fresh())->trashed()->toBeFalse();
});
