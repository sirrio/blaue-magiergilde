<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Leitet den Benutzer zur Discord-Authentifizierung weiter.
     */
    public function redirectToProvider(): RedirectResponse
    {
        return Socialite::driver('discord')
            ->redirect();
    }

    /**
     * Verarbeitet den Callback von Discord.
     */
    public function handleProviderCallback(): RedirectResponse
    {
        $discordUser = Socialite::driver('discord')->user();
        $discordId = $discordUser->getId();
        $discordProfile = $this->resolveDiscordProfile($discordUser);

        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();

            $discordAlreadyLinked = User::query()
                ->where('discord_id', $discordId)
                ->whereKeyNot($user->getKey())
                ->exists();

            if ($discordAlreadyLinked) {
                return redirect()
                    ->route('profile.edit')
                    ->with('error', 'This Discord account is already linked to another user. Please contact an administrator.');
            }

            $user->discord_id = $discordId;
            $user->avatar = $discordUser->getAvatar();
            $user->discord_username = $discordProfile['username'];
            $user->discord_display_name = $discordProfile['display_name'];
            $user->save();

            return redirect()
                ->route('profile.edit')
                ->with('status', 'discord-connected');
        }

        $user = User::query()
            ->where('discord_id', $discordId)
            ->first();

        if ($user) {
            $user->avatar = $discordUser->getAvatar();
            $user->discord_username = $discordProfile['username'];
            $user->discord_display_name = $discordProfile['display_name'];
            $user->save();
        } else {
            $fallbackName = trim((string) (
                $discordProfile['display_name']
                ?? $discordProfile['username']
                ?? $discordUser->getName()
                ?? 'Discord User'
            ));

            $user = User::query()->create([
                'discord_id' => $discordId,
                'discord_username' => $discordProfile['username'],
                'discord_display_name' => $discordProfile['display_name'],
                'name' => $fallbackName !== '' ? $fallbackName : 'Discord User',
                'avatar' => $discordUser->getAvatar(),
                'password' => null,
            ]);
        }

        Auth::login($user, true);

        return $this->redirectAfterLogin($user);
    }

    /**
     * @return array{username: string|null, display_name: string|null}
     */
    private function resolveDiscordProfile(object $discordUser): array
    {
        $raw = is_array($discordUser->user ?? null) ? $discordUser->user : [];

        $username = is_string($raw['username'] ?? null)
            ? trim((string) $raw['username'])
            : null;
        $displayName = is_string($raw['global_name'] ?? null)
            ? trim((string) $raw['global_name'])
            : null;

        if ($displayName === '' && method_exists($discordUser, 'getNickname')) {
            $nickname = $discordUser->getNickname();
            $displayName = is_string($nickname) ? trim($nickname) : null;
        }

        return [
            'username' => $username !== '' ? $username : null,
            'display_name' => $displayName !== '' ? $displayName : null,
        ];
    }

    private function redirectAfterLogin(User $user): RedirectResponse
    {
        $requiredVersion = (int) Config::get('legal.privacy_policy.version', 0);
        $acceptedVersion = (int) ($user->privacy_policy_accepted_version ?? 0);

        if ($user->privacy_policy_accepted_at === null || $acceptedVersion < $requiredVersion) {
            return redirect()->route('privacy-consent.show');
        }

        return redirect()->route('characters.index');
    }
}
