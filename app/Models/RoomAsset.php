<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomAsset extends Model
{
    protected $fillable = [
        'room_id',
        'user_id',
        'source',
        'library_path',
        'file_path',
        'original_name',
        'mime_type',
        'size',
        'width',
        'height',
        'pos_x',
        'pos_y',
        'scale',
        'scale_x',
        'scale_y',
        'rotation',
        'z_index',
    ];

    protected $casts = [
        'pos_x' => 'float',
        'pos_y' => 'float',
        'scale' => 'float',
        'scale_x' => 'float',
        'scale_y' => 'float',
        'rotation' => 'float',
    ];

    public function getFilePathAttribute(?string $value): ?string
    {
        if ($this->source === 'library' && $this->library_path) {
            return route('rooms.assets.library.show', ['path' => $this->library_path]);
        }

        return $value;
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
