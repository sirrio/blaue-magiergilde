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
    ];

    protected $casts = [
        'owner_ids' => 'array',
    ];

    public static function current(): self
    {
        $existing = static::query()->first();
        if ($existing) {
            return $existing;
        }

        return static::query()->create([
            'owner_ids' => static::parseIds(env('DISCORD_OWNER_IDS')),
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
