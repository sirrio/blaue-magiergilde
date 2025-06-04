<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Http\RedirectResponse;

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

    $user = User::query()->updateOrCreate(
      [
        'discord_id' => $discordUser->getId(),
      ],
      [
        'name' => $discordUser->getName(),
        'avatar' => $discordUser->getAvatar(),
        'password' => '',
      ]
    );

    Auth::login($user, true);

    return redirect()->route('characters.index');
  }
}
