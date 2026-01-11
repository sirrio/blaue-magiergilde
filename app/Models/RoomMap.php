<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RoomMap extends Model
{
    protected $fillable = [
        'name',
        'image_path',
        'grid_columns',
        'grid_rows',
    ];

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }
}
