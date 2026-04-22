<?php

namespace App\Http\Middleware;

use App\Models\CharacterClass;
use App\Models\DiscordBackupSetting;
use App\Models\DiscordChannel;
use App\Support\FeatureAccess;
use App\Support\LevelProgression;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Lab404\Impersonate\Services\ImpersonateManager;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $handbookChannels = collect();

        if ($user) {
            $selectedChannelIds = DiscordBackupSetting::query()
                ->pluck('channel_ids')
                ->filter()
                ->flatten()
                ->unique()
                ->values();

            if ($selectedChannelIds->isNotEmpty()) {
                $handbookChannels = DiscordChannel::query()
                    ->whereIn('id', $selectedChannelIds)
                    ->where('is_thread', false)
                    ->where('type', 'GuildText')
                    ->orderBy('name')
                    ->get(['id', 'name']);
            }
        }

        return [
            ...parent::share($request),
            'locale' => app()->getLocale(),
            'availableLocales' => ['de', 'en'],
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user
                    ? [
                        ...$user->toArray(),
                        'has_password' => ! empty($user->password),
                        'needs_password_fallback' => (bool) $user->discord_id && empty($user->password),
                    ]
                    : null,
            ],
            'impersonating' => (function () use ($user) {
                if (! $user) {
                    return null;
                }
                $manager = app(ImpersonateManager::class);
                if (! $manager->isImpersonating()) {
                    return null;
                }

                return ['name' => $manager->getImpersonator()?->name];
            })(),
            'features' => [
                'games_calendar' => config('features.games_calendar'),
                'rooms' => config('features.rooms'),
                'character_status_switch' => config('features.character_status_switch'),
                /** TODO: remove this temporary beta flag once level curve upgrades are released for everyone. */
                'level_curve_upgrade' => FeatureAccess::canUseLevelCurveUpgrade($user),
            ],
            'botChannelOverride' => [
                'active' => filled(config('services.bot.channel_override_id')),
                'channel_id' => config('services.bot.channel_override_id'),
            ],
            'discordConnected' => (bool) $user?->discord_id,
            'appearance' => $request->cookie('appearance', 'system'),
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'classes' => CharacterClass::query()->select(['id', 'name', 'guild_enabled'])->get(),
            'factions' => [
                'none' => 'Keine',
                'heiler' => 'Heiler',
                'handwerker' => 'Handwerker',
                'feldforscher' => 'Feldforscher',
                'bibliothekare' => 'Bibliothekare',
                'diplomaten' => 'Diplomaten',
                'gardisten' => 'Gardisten',
                'unterhalter' => 'Unterhalter',
                'logistiker' => 'Logistiker',
                'flora & fauna' => 'Flora & Fauna',
                'agenten' => 'Agenten',
                'waffenmeister' => 'Waffenmeister',
                'arkanisten' => 'Arkanisten',
            ],
            'versions' => [
                '2014',
                '2024',
            ],
            'tiers' => [
                'bt' => 'Beginner Tier',
                'lt' => 'Low Tier',
                'ht' => 'High Tier',
                'et' => 'Epic Tier',
            ],
            'handbookChannels' => $handbookChannels,
            'levelProgressionTotals' => LevelProgression::totals(),
            'levelProgressionTotalsByVersion' => LevelProgression::allTotalsByVersion(),
            'activeLevelProgressionVersionId' => LevelProgression::activeVersionId(),
        ];
    }
}
