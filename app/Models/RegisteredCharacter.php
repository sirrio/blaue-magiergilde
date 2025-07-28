<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegisteredCharacter extends Model
{
    use HasFactory;

    protected $fillable = [
        'registered_player_id',
        'name',
        'tier',
        'url',
    ];

    public function registeredPlayer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(RegisteredPlayer::class);
    }
}
