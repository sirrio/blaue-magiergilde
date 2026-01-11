<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Room extends Model
{
    protected $fillable = [
        'room_map_id',
        'name',
        'grid_x',
        'grid_y',
        'grid_w',
        'grid_h',
        'character_id',
    ];

    public function map(): BelongsTo
    {
        return $this->belongsTo(RoomMap::class, 'room_map_id');
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
