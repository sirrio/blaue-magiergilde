<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoiceSetting extends Model
{
    protected $fillable = [
        'voice_channel_id',
        'voice_channel_name',
        'voice_channel_type',
        'voice_channel_guild_id',
        'voice_channel_is_thread',
    ];

    protected $casts = [
        'voice_channel_is_thread' => 'boolean',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
