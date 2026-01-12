<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackstockSetting extends Model
{
    protected $fillable = [
        'post_channel_id',
        'post_channel_name',
        'post_channel_type',
        'post_channel_guild_id',
        'post_channel_is_thread',
        'last_post_channel_id',
        'last_post_message_ids',
    ];

    protected $casts = [
        'post_channel_is_thread' => 'boolean',
        'last_post_message_ids' => 'array',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
