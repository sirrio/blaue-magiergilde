<?php

namespace App\Http\Controllers\Backstock;

use App\Http\Controllers\Controller;
use App\Models\BackstockItem;
use App\Models\BackstockSetting;
use App\Models\Item;
use Inertia\Inertia;
use Inertia\Response;

class BackstockController extends Controller
{
    public function index(): Response
    {
        $backstockItems = BackstockItem::query()
            ->with([
                'item' => fn ($query) => $query->select(['id', 'name', 'url', 'cost', 'rarity', 'type']),
            ])
            ->orderBy('id')
            ->get([
                'id',
                'item_id',
                'item_name',
                'item_url',
                'item_cost',
                'item_rarity',
                'item_type',
                'notes',
                'created_at',
            ]);

        $items = Item::query()
            ->orderBy('name')
            ->select(['id', 'name', 'url', 'cost', 'rarity', 'type'])
            ->get();

        $settings = BackstockSetting::current();

        return Inertia::render('backstock/index', [
            'backstockItems' => $backstockItems,
            'items' => $items,
            'backstockSettings' => $settings->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
                'last_post_channel_id',
            ]),
        ]);
    }
}
