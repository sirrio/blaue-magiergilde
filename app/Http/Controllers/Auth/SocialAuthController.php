<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
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
                    ->with('error', 'This Discord account is already linked to another user.');
            }

            $user->discord_id = $discordId;
            $user->avatar = $discordUser->getAvatar();
            $user->save();

            return redirect()
                ->route('profile.edit')
                ->with('status', 'discord-connected');
        }

        $user = User::query()->updateOrCreate(
            [
                'discord_id' => $discordId,
            ],
            [
                'name' => $discordUser->getName(),
                'avatar' => $discordUser->getAvatar(),
                'password' => null,
            ]
        );

        Auth::login($user, true);

        return redirect()->route('characters.index');
    }
}
