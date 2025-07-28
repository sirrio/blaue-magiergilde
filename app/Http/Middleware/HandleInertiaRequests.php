<?php

namespace App\Http\Middleware;

use App\Models\CharacterClass;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
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
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'features' => config('features'),
            'appearance' => $request->cookie('appearance', 'system'),
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'classes' => CharacterClass::query()->select(['id', 'name'])->get(),
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
        ];
    }
}
