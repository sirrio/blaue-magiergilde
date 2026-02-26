<?php

namespace App\Http\Controllers\Item;

use App\Http\Controllers\Controller;
use App\Http\Requests\Item\StoreItemRequest;
use App\Http\Requests\Item\UpdateItemRequest;
use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\Source;
use App\Support\ItemCostResolver;
use App\Support\ItemPricing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $rarity = request('rarity');
        $type = request('type');
        $guild = request('guild');
        $shop = request('shop');
        $spell = request('spell');
        $source = request('source');
        $ruling = request('ruling');
        $searchTerm = request('search');

        $itemQuery = Item::query();
        $itemQuery->with([
            'source:id,name,shortcode',
            'mundaneVariants:id,name,slug,category,cost_gp,is_placeholder,sort_order',
        ]);

        if (! empty($searchTerm)) {
            $itemQuery->where('name', 'LIKE', "%$searchTerm%");
        }
        if (! empty($rarity)) {
            $itemQuery->where('rarity', $rarity);
        }
        if (! empty($type)) {
            $itemQuery->where('type', $type);
        }
        if ($guild === 'allowed') {
            $itemQuery->where('guild_enabled', true);
        } elseif ($guild === 'blocked') {
            $itemQuery->where(function ($query) {
                $query->whereNull('guild_enabled')->orWhere('guild_enabled', false);
            });
        }
        if ($shop === 'included') {
            $itemQuery->where('shop_enabled', true);
        } elseif ($shop === 'excluded') {
            $itemQuery->where(function ($query) {
                $query->whereNull('shop_enabled')->orWhere('shop_enabled', false);
            });
        }
        if ($spell === 'attached') {
            $itemQuery->where('default_spell_roll_enabled', true);
        } elseif ($spell === 'none') {
            $itemQuery->where(function ($query) {
                $query->whereNull('default_spell_roll_enabled')->orWhere('default_spell_roll_enabled', false);
            });
        }
        if ($source === 'none') {
            $itemQuery->whereNull('source_id');
        } elseif (is_numeric($source)) {
            $itemQuery->where('source_id', (int) $source);
        }
        if ($ruling === 'changed') {
            $itemQuery->where('ruling_changed', true);
        } elseif ($ruling === 'none') {
            $itemQuery->where(function ($query) {
                $query->whereNull('ruling_changed')->orWhere('ruling_changed', false);
            });
        }

        $items = $itemQuery
            ->orderBy('rarity')
            ->orderBy('type')
            ->orderBy('name')
            ->select([
                'id',
                'name',
                'cost',
                'url',
                'rarity',
                'type',
                'pick_count',
                'shop_enabled',
                'guild_enabled',
                'default_spell_roll_enabled',
                'default_spell_levels',
                'default_spell_schools',
                'ruling_changed',
                'ruling_note',
                'source_id',
            ])
            ->get()
            ->map(function (Item $item): array {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'cost' => $item->cost,
                    'display_cost' => ItemCostResolver::resolveForItem($item),
                    'url' => $item->url,
                    'rarity' => $item->rarity,
                    'type' => $item->type,
                    'pick_count' => $item->pick_count,
                    'shop_enabled' => $item->shop_enabled,
                    'guild_enabled' => $item->guild_enabled,
                    'default_spell_roll_enabled' => $item->default_spell_roll_enabled,
                    'default_spell_levels' => $item->default_spell_levels,
                    'default_spell_schools' => $item->default_spell_schools,
                    'ruling_changed' => $item->ruling_changed,
                    'ruling_note' => $item->ruling_note,
                    'source_id' => $item->source_id,
                    'source' => $item->source,
                    'mundane_variant_ids' => $item->mundaneVariants->pluck('id')->values(),
                    'mundane_variants' => $item->mundaneVariants->map(static function (MundaneItemVariant $variant): array {
                        return [
                            'id' => $variant->id,
                            'name' => $variant->name,
                            'slug' => $variant->slug,
                            'category' => $variant->category,
                            'cost_gp' => $variant->cost_gp !== null ? (float) $variant->cost_gp : null,
                            'is_placeholder' => $variant->is_placeholder,
                        ];
                    })->values(),
                ];
            });

        return Inertia::render('item/index', [
            'items' => Inertia::defer(fn () => $items),
            'sources' => Source::query()
                ->orderBy('shortcode')
                ->orderBy('name')
                ->get(['id', 'name', 'shortcode']),
            'mundaneVariants' => MundaneItemVariant::query()
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'category', 'cost_gp', 'is_placeholder'])
                ->map(static function (MundaneItemVariant $variant): array {
                    return [
                        'id' => $variant->id,
                        'name' => $variant->name,
                        'slug' => $variant->slug,
                        'category' => $variant->category,
                        'cost_gp' => $variant->cost_gp !== null ? (float) $variant->cost_gp : null,
                        'is_placeholder' => $variant->is_placeholder,
                    ];
                }),
            'canManage' => request()->routeIs('admin.items.index'),
            'indexRoute' => request()->routeIs('admin.items.index')
                ? 'admin.items.index'
                : 'compendium.items.index',
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
    public function store(StoreItemRequest $request): RedirectResponse
    {
        $item = new Item;

        $item->name = $request->name;
        $item->cost = ItemPricing::storageCost($request->rarity, $request->type);
        $item->url = $request->url;
        $item->rarity = $request->rarity;
        $item->type = $request->type;
        $item->source_id = $request->input('source_id');
        $item->shop_enabled = $request->boolean('shop_enabled', true);
        $item->guild_enabled = $request->boolean('guild_enabled', true);
        $this->applyRulingNote($item, $request);
        $this->applyDefaultSpellRoll($item, $request);
        $item->save();
        $item->mundaneVariants()->sync(array_values(array_unique(array_filter(array_map(
            static fn ($value) => (int) $value,
            (array) $request->input('mundane_variant_ids', []),
        ), static fn (int $id) => $id > 0))));

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(Item $item)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Item $item)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateItemRequest $request, Item $item): RedirectResponse
    {
        $item->name = $request->name;
        $item->cost = ItemPricing::storageCost($request->rarity, $request->type);
        $item->url = $request->url;
        $item->rarity = $request->rarity;
        $item->type = $request->type;
        $item->source_id = $request->input('source_id');
        $item->shop_enabled = $request->boolean('shop_enabled', true);
        $item->guild_enabled = $request->boolean('guild_enabled', true);
        $this->applyRulingNote($item, $request);
        $this->applyDefaultSpellRoll($item, $request);
        $item->save();
        $item->mundaneVariants()->sync(array_values(array_unique(array_filter(array_map(
            static fn ($value) => (int) $value,
            (array) $request->input('mundane_variant_ids', []),
        ), static fn (int $id) => $id > 0))));

        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Item $item): RedirectResponse
    {
        $item->delete();

        return redirect()->back();
    }

    private function applyDefaultSpellRoll(Item $item, Request $request): void
    {
        $levels = $request->input('default_spell_levels');
        $schools = $request->input('default_spell_schools');

        $levels = array_values(array_unique(array_filter(array_map(
            static fn ($value) => is_numeric($value) ? (int) $value : null,
            (array) $levels
        ), static fn ($value) => $value !== null && $value >= 0 && $value <= 9)));
        $schools = array_values(array_unique(array_filter(array_map(
            static fn ($value) => $value !== null ? (string) $value : null,
            (array) $schools
        ), static fn ($value) => $value !== null && $value !== '')));

        $autoRoll = $request->boolean('default_spell_roll_enabled') && count($levels) > 0;

        $item->default_spell_roll_enabled = $autoRoll;
        $item->default_spell_levels = $autoRoll ? $levels : null;
        $item->default_spell_schools = $autoRoll ? ($schools === [] ? null : $schools) : null;
    }

    private function applyRulingNote(Item $item, Request $request): void
    {
        $hasRulingChange = $request->boolean('ruling_changed');
        $note = $hasRulingChange ? trim((string) $request->input('ruling_note', '')) : '';

        $item->ruling_changed = $hasRulingChange;
        $item->ruling_note = $note !== '' ? $note : null;
    }
}
