<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LevelProgressionEntry extends Model
{
    protected $table = 'level_progressions';

    protected $fillable = [
        'level',
        'required_bubbles',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'required_bubbles' => 'integer',
        ];
    }
}
