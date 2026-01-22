<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameAnnouncement extends Model
{
    protected $fillable = [
        'discord_channel_id',
        'discord_message_id',
        'discord_author_id',
        'discord_author_name',
        'title',
        'content',
        'tier',
        'starts_at',
        'posted_at',
        'confidence',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'posted_at' => 'datetime',
        'confidence' => 'decimal:2',
    ];
}
