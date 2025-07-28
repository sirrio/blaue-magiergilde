<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\StoreShopRequest;
use App\Http\Requests\Shop\UpdateShopRequest;
use App\Models\Item;
use App\Models\Shop;
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
                'items' => function ($query) {
                    $query
                        ->select(['items.id', 'name', 'url', 'cost', 'rarity', 'type', 'pick_count'])
                        ->with('pivot.spell');
                },
            ])
            ->orderByDesc('created_at')
            ->select(['shops.id', 'created_at'])
            ->get();

        return Inertia::render('shop/index', [
            'shops' => $shops,
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
        $items = Item::all()->groupBy([
            'rarity',
            function ($item) {
                return ($item->rarity === 'very_rare' || $item->rarity === 'rare') && in_array($item->type, ['consumable', 'spellscroll']) ? 'consumable' : $item->type;
            },
        ]);

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

        $itemData = [];
        foreach ($pickedItems as $item) {
            $pivotData = [];
            if ($item['type'] === 'spellscroll') {
                $level = 0;
                if (str_contains(strtolower($item['name']), 'cantrip')) {
                    $level = 0;
                } elseif (preg_match('/(\d+)/', $item['name'], $m)) {
                    $level = (int) $m[1];
                }
                $spell = Spell::query()
                    ->where('spell_level', $level)
                    ->inRandomOrder()
                    ->first();
                if ($spell) {
                    $pivotData['spell_id'] = $spell->id;
                }
            }
            $itemData[$item['id']] = $pivotData;
        }

        DB::transaction(function () use ($itemData) {
            Item::query()
                ->whereIn('id', array_keys($itemData))
                ->increment('pick_count');

            $shop = Shop::query()->create();
            $shop->items()->attach($itemData);
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
