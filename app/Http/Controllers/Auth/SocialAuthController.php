<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class SocialAuthController extends Controller
{
    /**
     * Leitet den Benutzer zur Discord-Authentifizierung weiter.
     */
    public function redirectToProvider(): RedirectResponse
    {
        return Socialite::driver('discord')
            ->setScopes(['identify'])
            ->withConsent()
            ->redirect();
    }

    /**
     * Verarbeitet den Callback von Discord.
     */
    public function handleProviderCallback(Request $request, CharacterApprovalNotificationService $notifications): RedirectResponse
    {
        $isLinkingDiscord = Auth::check();

        if ($request->filled('error')) {
            return $this->redirectForFailedCallback($isLinkingDiscord, $this->discordErrorMessage($request));
        }

        try {
            $discordUser = Socialite::driver('discord')->user();
        } catch (Throwable $exception) {
            report($exception);

            return $this->redirectForFailedCallback(
                $isLinkingDiscord,
                'Discord authentication failed. Please try again. If the problem persists, contact an administrator.',
            );
        }

        $discordId = $discordUser->getId();
        $discordProfile = $this->resolveDiscordProfile($discordUser);

        if ($isLinkingDiscord) {
            /** @var User $user */
            $user = Auth::user();

            $discordAlreadyLinked = User::query()
                ->withTrashed()
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
            ->withTrashed()
            ->where('discord_id', $discordId)
            ->first();
        $createdNewAccount = ! $user;

        if ($user) {
            if ($user->trashed()) {
                $user->restore();
            }

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

            $createdAt = Carbon::now();

            User::query()->insertOrIgnore([
                'discord_id' => $discordId,
                'discord_username' => $discordProfile['username'],
                'discord_display_name' => $discordProfile['display_name'],
                'name' => $fallbackName !== '' ? $fallbackName : 'Discord User',
                'avatar' => $discordUser->getAvatar(),
                'password' => null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $user = User::query()
                ->withTrashed()
                ->where('discord_id', $discordId)
                ->first();

            if (! $user) {
                return $this->redirectForFailedCallback(
                    false,
                    'Discord authentication failed. Please try again. If the problem persists, contact an administrator.',
                );
            }

            if ($user->trashed()) {
                $user->restore();
            }

            $user->avatar = $discordUser->getAvatar();
            $user->discord_username = $discordProfile['username'];
            $user->discord_display_name = $discordProfile['display_name'];
            $user->save();
        }

        if ($createdNewAccount) {
            $result = $notifications->notifyNewAccount($user, 'discord');
            if (! ($result['ok'] ?? false)) {
                Log::warning('New account approval notification failed.', [
                    'user_id' => $user->id,
                    'source' => 'discord',
                    'status' => $result['status'] ?? null,
                    'error' => $result['error'] ?? null,
                ]);
            }
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

    private function redirectForFailedCallback(bool $isLinkingDiscord, string $message): RedirectResponse
    {
        if ($isLinkingDiscord) {
            return redirect()
                ->route('profile.edit')
                ->with('error', $message);
        }

        return redirect()
            ->route('login')
            ->with('error', $message);
    }

    private function discordErrorMessage(Request $request): string
    {
        $error = trim((string) $request->query('error', ''));

        if ($error === 'access_denied') {
            return 'Discord authentication was cancelled.';
        }

        return 'Discord authentication failed. Please try again.';
    }
}
