<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscordMessage extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'discord_channel_id',
        'guild_id',
        'author_id',
        'author_name',
        'author_display_name',
        'content',
        'message_type',
        'is_pinned',
        'sent_at',
        'edited_at',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'sent_at' => 'datetime',
            'edited_at' => 'datetime',
            'payload' => 'array',
        ];
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(DiscordChannel::class, 'discord_channel_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(DiscordMessageAttachment::class, 'discord_message_id');
    }
}
