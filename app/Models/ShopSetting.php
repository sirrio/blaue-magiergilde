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
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
