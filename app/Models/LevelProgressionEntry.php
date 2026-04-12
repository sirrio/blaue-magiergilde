<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LevelProgressionEntry extends Model
{
    protected $table = 'level_progressions';

    protected $fillable = [
        'version_id',
        'level',
        'required_bubbles',
    ];

    protected function casts(): array
    {
        return [
            'version_id' => 'integer',
            'level' => 'integer',
            'required_bubbles' => 'integer',
        ];
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(LevelProgressionVersion::class, 'version_id');
    }
}
