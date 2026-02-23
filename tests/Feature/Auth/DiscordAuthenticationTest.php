<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

uses(RefreshDatabase::class);

function fakeDiscordUser(string $id, string $name = 'Discord User', ?string $avatar = 'https://example.test/avatar.png'): SocialiteUser
{
    $discordUser = Mockery::mock(SocialiteUser::class);
    $discordUser->shouldReceive('getId')->andReturn($id);
    $discordUser->shouldReceive('getName')->andReturn($name);
    $discordUser->shouldReceive('getAvatar')->andReturn($avatar);

    return $discordUser;
}

test('discord callback redirects users without accepted privacy policy to consent page', function () {
    Socialite::shouldReceive('driver->user')
        ->once()
        ->andReturn(fakeDiscordUser('123456789012345678'));

    $response = $this->get(route('discord.callback'));

    $response->assertRedirect(route('privacy-consent.show', absolute: false));
    $this->assertAuthenticated();

    $user = User::query()->where('discord_id', 123456789012345678)->first();

    expect($user)->not->toBeNull()
        ->and($user?->privacy_policy_accepted_at)->toBeNull()
        ->and((int) ($user?->privacy_policy_accepted_version ?? 0))->toBe(0);
});

test('discord callback redirects users with current privacy policy to characters page', function () {
    $requiredVersion = (int) config('legal.privacy_policy.version', 0);

    $user = User::factory()->create([
        'discord_id' => 123456789012345679,
        'privacy_policy_accepted_at' => now(),
        'privacy_policy_accepted_version' => $requiredVersion,
    ]);

    Socialite::shouldReceive('driver->user')
        ->once()
        ->andReturn(fakeDiscordUser((string) $user->discord_id, 'Updated Discord Name'));

    $response = $this->get(route('discord.callback'));

    $response->assertRedirect(route('characters.index', absolute: false));
    $this->assertAuthenticatedAs($user->fresh());
});

test('discord callback does not clear password for existing linked users', function () {
    $requiredVersion = (int) config('legal.privacy_policy.version', 0);

    $user = User::factory()->create([
        'discord_id' => 123456789012345680,
        'password' => Hash::make('OriginalSecret123!'),
        'privacy_policy_accepted_at' => now(),
        'privacy_policy_accepted_version' => $requiredVersion,
    ]);

    Socialite::shouldReceive('driver->user')
        ->once()
        ->andReturn(fakeDiscordUser((string) $user->discord_id, 'Updated Discord Name'));

    $this->get(route('discord.callback'))
        ->assertRedirect(route('characters.index', absolute: false));

    $freshUser = $user->fresh();

    expect($freshUser)->not->toBeNull()
        ->and($freshUser?->password)->not->toBeNull()
        ->and(Hash::check('OriginalSecret123!', (string) $freshUser?->password))->toBeTrue();
});
