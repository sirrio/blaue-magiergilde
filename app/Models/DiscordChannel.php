<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscordChannel extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'guild_id',
        'name',
        'type',
        'parent_id',
        'is_thread',
        'last_message_id',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'is_thread' => 'boolean',
            'last_synced_at' => 'datetime',
        ];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(DiscordMessage::class, 'discord_channel_id');
    }
}
