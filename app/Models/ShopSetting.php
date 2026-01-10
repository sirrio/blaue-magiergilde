<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
    ];

    protected $casts = [
        'post_channel_is_thread' => 'boolean',
        'last_post_message_ids' => 'array',
        'auto_post_enabled' => 'boolean',
        'auto_post_weekday' => 'integer',
        'last_auto_posted_at' => 'datetime',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
