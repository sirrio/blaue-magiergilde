<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiscordBackupSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'guild_id',
        'channel_ids',
    ];

    protected function casts(): array
    {
        return [
            'channel_ids' => 'array',
        ];
    }
}
