<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\StoreShopRequest;
use App\Http\Requests\Shop\UpdateShopRequest;
use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopSetting;
use App\Models\ShopItem;
use App\Models\Spell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
    private function calculateWeight($alpha, $input, $minPickCount): float
    {
        return exp(-$alpha * ($input - $minPickCount));
    }

    private function weightedRandomSelection(array $items, int $count): array
    {
        if (empty($items)) {
            return [];
        }

        $minPickCount = min(array_column($items, 'pick_count'));
        $weights = array_map(fn ($item) => $this->calculateWeight(0.9, $item['pick_count'], $minPickCount), $items);
        $totalWeight = array_sum($weights);

        $picked = [];
        for ($i = 0; $i < $count && count($items) > 0; $i++) {
            $rand = mt_rand(0, $totalWeight * 1000) / 1000;
            $cumulativeWeight = 0;

            foreach ($items as $index => $item) {
                $cumulativeWeight += $weights[$index];
                if ($rand <= $cumulativeWeight) {
                    $picked[] = $item;
                    $totalWeight -= $weights[$index];
                    unset($items[$index]);
                    unset($weights[$index]);
                    break;
                }
            }
        }

        return $picked;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $shops = Shop::query()
            ->with([
                'shopItems.item' => fn ($query) => $query->select(['id', 'name', 'url', 'cost', 'rarity', 'type', 'pick_count']),
                'shopItems.spell' => fn ($query) => $query->select(['id', 'name', 'url', 'legacy_url', 'spell_level']),
            ])
            ->orderByDesc('created_at')
            ->select(['shops.id', 'created_at'])
            ->get();

        return Inertia::render('shop/index', [
            'shops' => $shops,
            'shopSettings' => ShopSetting::current()->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
            ]),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreShopRequest $request): RedirectResponse
    {
        // Previously the shop creation looped 200 times, producing hundreds
        // of shops in a single request. Removing that loop ensures only a
        // single shop is rolled per request.

        $items = Item::query()
            ->where('shop_enabled', true)
            ->get()
            ->groupBy(['rarity', function ($item) {
            return ($item->rarity === 'very_rare' || $item->rarity === 'rare') && in_array($item->type, ['consumable', 'spellscroll']) ? 'consumable' : $item->type;
        }]);

        $selectionRules = [
            'common' => ['item' => 5, 'consumable' => 1, 'spellscroll' => 1],
            'uncommon' => ['item' => 3, 'consumable' => 1, 'spellscroll' => 1],
            'rare' => ['item' => 2, 'consumable' => 1, 'spellscroll' => 0],
            'very_rare' => ['item' => 1, 'consumable' => 1, 'spellscroll' => 0],
        ];

        $pickedItems = [];

        foreach ($selectionRules as $rarity => $typeRules) {
            foreach ($typeRules as $type => $count) {
                if (isset($items[$rarity][$type])) {
                    $itemsArray = $items[$rarity][$type]->toArray();

                    // Pick weighted random items
                    $picked = $this->weightedRandomSelection($itemsArray, $count);
                    $pickedItems = array_merge($pickedItems, $picked);
                }
            }
        }

        $pickedItemIds = array_column($pickedItems, 'id');

        DB::transaction(function () use ($pickedItems, $pickedItemIds) {
            Item::query()->whereIn('id', $pickedItemIds)->increment('pick_count');
            $shop = Shop::query()->create();

            foreach ($pickedItems as $pickedItem) {
                $spellId = null;
                $autoRollEnabled = ! empty($pickedItem['default_spell_roll_enabled']);
                $spellLevels = $pickedItem['default_spell_levels'] ?? [];
                $spellSchools = $pickedItem['default_spell_schools'] ?? [];

                if ($autoRollEnabled && is_array($spellLevels) && count($spellLevels) > 0) {
                    $normalizedLevels = array_values(array_unique(array_filter(array_map(
                        static fn ($value) => is_numeric($value) ? (int) $value : null,
                        $spellLevels
                    ), static fn ($value) => $value !== null && $value >= 0 && $value <= 9)));
                    $normalizedSchools = is_array($spellSchools)
                        ? array_values(array_unique(array_filter(array_map(
                            static fn ($value) => $value !== null ? (string) $value : null,
                            $spellSchools
                        ), static fn ($value) => $value !== null && $value !== '')))
                        : [];

                    if ($normalizedLevels !== []) {
                        $query = Spell::query()->whereIn('spell_level', $normalizedLevels);
                        if ($normalizedSchools !== []) {
                            $query->whereIn('spell_school', $normalizedSchools);
                        }
                        $spellId = $query->inRandomOrder()->value('id');
                    }
                }

                ShopItem::query()->create([
                    'shop_id' => $shop->id,
                    'item_id' => $pickedItem['id'],
                    'spell_id' => $spellId,
                ]);
            }
        });

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Shop $shop)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Shop $shop)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateShopRequest $request, Shop $shop)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Shop $shop)
    {
        //
    }
}
