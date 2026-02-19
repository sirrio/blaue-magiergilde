<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscordBotSetting extends Model
{
    protected $fillable = [
        'owner_ids',
        'character_approval_channel_id',
        'character_approval_channel_name',
        'character_approval_channel_guild_id',
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
        'owner_ids' => 'array',
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
            'owner_ids' => static::parseIds(env('DISCORD_OWNER_IDS')),
            'games_scan_years' => 10,
            'games_scan_interval_minutes' => 60,
        ]);
    }

    private static function parseIds(?string $value): array
    {
        if ($value === null) {
            return [];
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return [];
        }

        return collect(explode(',', $raw))
            ->map(fn ($id) => trim($id))
            ->filter(fn (string $id) => preg_match('/^[0-9]{5,}$/', $id))
            ->values()
            ->all();
    }
}
