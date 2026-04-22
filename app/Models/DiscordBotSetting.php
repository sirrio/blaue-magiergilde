<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscordBotSetting extends Model
{
    protected $fillable = [
        'character_approval_channel_id',
        'character_approval_channel_name',
        'character_approval_channel_guild_id',
        'character_retirement_channel_id',
        'character_retirement_channel_name',
        'character_retirement_channel_guild_id',
        'games_channel_id',
        'games_channel_name',
        'games_channel_guild_id',
        'games_scan_years',
        'games_scan_interval_minutes',
        'support_ticket_channel_id',
        'support_ticket_channel_name',
        'support_ticket_channel_guild_id',
    ];

    protected $casts = [
        'games_scan_years' => 'integer',
        'games_scan_interval_minutes' => 'integer',
    ];

    public static function current(): self
    {
        $existing = static::query()->first();
        if ($existing) {
            return $existing;
        }

        return static::query()->create([
            'games_scan_years' => 10,
            'games_scan_interval_minutes' => 60,
        ]);
    }
}
