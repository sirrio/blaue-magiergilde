<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\StoreShopRequest;
use App\Http\Requests\Shop\UpdateShopRequest;
use App\Models\Shop;
use App\Models\ShopSetting;
use App\Services\ShopRollService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
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
                'auto_post_enabled',
                'auto_post_weekday',
                'auto_post_time',
                'last_auto_posted_at',
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
    public function store(StoreShopRequest $request, ShopRollService $shopRoller): RedirectResponse
    {
        // Previously the shop creation looped 200 times, producing hundreds
        // of shops in a single request. Removing that loop ensures only a
        // single shop is rolled per request.
        $shopRoller->roll();

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
