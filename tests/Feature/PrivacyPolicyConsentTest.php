<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('authenticated users without current privacy consent are redirected to consent page', function () {
    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $this->actingAs($user)
        ->get('/characters')
        ->assertRedirect(route('privacy-consent.show'));
});

test('privacy consent page can be rendered for users without consent', function () {
    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $this->actingAs($user)
        ->get(route('privacy-consent.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('privacy-consent')
            ->where('privacyPolicyVersion', (int) Config::get('legal.privacy_policy.version')));
});

test('users can accept updated privacy policy and continue', function () {
    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $this->actingAs($user)->get('/characters');

    $this->actingAs($user)
        ->post(route('privacy-consent.store'), [
            'privacy_policy_accepted' => true,
        ])
        ->assertRedirect('/characters');

    $user->refresh();

    expect($user->privacy_policy_accepted_at)->not->toBeNull()
        ->and((int) $user->privacy_policy_accepted_version)->toBe((int) Config::get('legal.privacy_policy.version'));
});

test('privacy consent acceptance ignores stale consent intended url', function () {
    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $this->actingAs($user)
        ->withSession(['url.intended' => route('privacy-consent.show')])
        ->post(route('privacy-consent.store'), [
            'privacy_policy_accepted' => true,
        ])
        ->assertRedirect(route('characters.index'));
});

test('privacy consent acceptance ignores stale oauth callback intended url', function () {
    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $this->actingAs($user)
        ->withSession(['url.intended' => route('discord.callback', ['code' => 'stale', 'state' => 'stale'])])
        ->post(route('privacy-consent.store'), [
            'privacy_policy_accepted' => true,
        ])
        ->assertRedirect(route('characters.index'));
});

test('privacy consent acceptance ignores external intended url', function () {
    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $this->actingAs($user)
        ->withSession(['url.intended' => 'https://example.com/phishing'])
        ->post(route('privacy-consent.store'), [
            'privacy_policy_accepted' => true,
        ])
        ->assertRedirect(route('characters.index'));
});

test('users must explicitly accept the privacy policy when submitting consent', function () {
    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $this->actingAs($user)
        ->post(route('privacy-consent.store'), [])
        ->assertSessionHasErrors('privacy_policy_accepted');
});
