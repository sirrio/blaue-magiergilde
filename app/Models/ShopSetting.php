<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopSetting extends Model
{
    protected $fillable = [
        'post_channel_id',
        'post_channel_name',
        'post_channel_type',
        'post_channel_guild_id',
        'post_channel_is_thread',
        'last_post_channel_id',
        'last_post_message_ids',
        'auto_post_enabled',
        'auto_post_weekday',
        'auto_post_time',
        'last_auto_posted_at',
        'current_shop_id',
        'draft_shop_id',
    ];

    protected $casts = [
        'post_channel_is_thread' => 'boolean',
        'last_post_message_ids' => 'array',
        'auto_post_enabled' => 'boolean',
        'auto_post_weekday' => 'integer',
        'last_auto_posted_at' => 'datetime',
        'current_shop_id' => 'integer',
        'draft_shop_id' => 'integer',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }

    public function currentShop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'current_shop_id');
    }

    public function draftShop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'draft_shop_id');
    }
}
