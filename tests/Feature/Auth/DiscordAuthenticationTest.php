<?php

use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Psr7\Request as PsrRequest;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

use function Pest\Laravel\mock;

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
    $notificationService = mock(CharacterApprovalNotificationService::class);
    $notificationService->shouldReceive('notifyNewAccount')
        ->once()
        ->withArgs(function (User $user, string $source): bool {
            return (string) $user->discord_id === '123456789012345678' && $source === 'discord';
        })
        ->andReturn(['ok' => true, 'status' => 200]);

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

test('discord redirect only requests the identify scope', function () {
    $provider = Mockery::mock();

    Socialite::shouldReceive('driver')
        ->once()
        ->with('discord')
        ->andReturn($provider);

    $provider->shouldReceive('setScopes')
        ->once()
        ->with(['identify'])
        ->andReturnSelf();

    $provider->shouldReceive('withConsent')
        ->once()
        ->andReturnSelf();

    $provider->shouldReceive('redirect')
        ->once()
        ->andReturn(redirect('https://discord.com/oauth2/authorize'));

    $this->get(route('discord.login'))
        ->assertRedirect('https://discord.com/oauth2/authorize');
});

test('discord callback redirects users with current privacy policy to characters page', function () {
    $notificationService = mock(CharacterApprovalNotificationService::class);
    $notificationService->shouldNotReceive('notifyNewAccount');

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

test('discord callback restores a soft deleted linked user instead of creating a duplicate', function () {
    $requiredVersion = (int) config('legal.privacy_policy.version', 0);

    $user = User::factory()->create([
        'discord_id' => 123456789012345681,
        'privacy_policy_accepted_at' => now(),
        'privacy_policy_accepted_version' => $requiredVersion,
        'deleted_at' => now(),
    ]);

    Socialite::shouldReceive('driver->user')
        ->once()
        ->andReturn(fakeDiscordUser((string) $user->discord_id, 'Restored Discord Name'));

    $this->get(route('discord.callback'))
        ->assertRedirect(route('characters.index', absolute: false));

    $freshUser = $user->fresh();

    expect($freshUser)->not->toBeNull()
        ->and($freshUser?->deleted_at)->toBeNull()
        ->and($freshUser?->discord_username)->toBeNull();

    $this->assertAuthenticatedAs($freshUser);
});

test('discord callback redirects to login with error when token exchange fails', function () {
    Socialite::shouldReceive('driver->user')
        ->once()
        ->andThrow(new ClientException(
            'Client error: `POST https://discord.com/api/oauth2/token` resulted in a `400 Bad Request` response.',
            new PsrRequest('POST', 'https://discord.com/api/oauth2/token'),
            new PsrResponse(400, [], '{"message":"400: Bad Request","code":0}')
        ));

    $response = $this->get(route('discord.callback'));

    $response->assertRedirect(route('login', absolute: false))
        ->assertSessionHas('error', 'Discord authentication failed. Please try again. If the problem persists, contact an administrator.');

    $this->assertGuest();
});
