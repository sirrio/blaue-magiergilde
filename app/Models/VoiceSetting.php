<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoiceSetting extends Model
{
    protected $fillable = [
        'voice_channel_id',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
