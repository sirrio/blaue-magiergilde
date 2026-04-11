<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\StoreShopRequest;
use App\Http\Requests\Shop\UpdateShopRequest;
use App\Models\Shop;
use App\Models\ShopRollRule;
use App\Services\ShopLifecycleService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(ShopLifecycleService $shopLifecycleService): Response
    {
        $shopSettings = $shopLifecycleService->ensureInitialized();

        $shops = Shop::query()
            ->with(['shopItems'])
            ->orderByDesc('created_at')
            ->select(['shops.id', 'created_at'])
            ->get();

        return Inertia::render('shop/index', [
            'shops' => $shops,
            'shopSettings' => $shopSettings->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
                'last_post_channel_id',
                'auto_post_enabled',
                'auto_post_weekday',
                'auto_post_time',
                'last_auto_posted_at',
                'current_shop_id',
                'draft_shop_id',
            ]) + [
                'roll_rules' => ShopRollRule::ordered()->map(fn (ShopRollRule $rule): array => [
                    'id' => $rule->id,
                    'row_kind' => $rule->row_kind,
                    'rarity' => $rule->rarity,
                    'selection_types' => $rule->selection_types ?? [],
                    'source_kind' => $rule->source_kind,
                    'heading_title' => $rule->heading_title,
                    'count' => $rule->count,
                    'sort_order' => $rule->sort_order,
                ])->all(),
            ],
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
    public function store(StoreShopRequest $request, ShopLifecycleService $shopLifecycleService): RedirectResponse
    {
        $shopLifecycleService->rollNewDraft();

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
