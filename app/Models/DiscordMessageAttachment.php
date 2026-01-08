<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscordMessageAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'discord_message_id',
        'attachment_id',
        'filename',
        'content_type',
        'size',
        'url',
        'storage_path',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(DiscordMessage::class, 'discord_message_id');
    }
}
