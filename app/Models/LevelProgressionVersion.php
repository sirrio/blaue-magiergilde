<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LevelProgressionVersion extends Model
{
    protected $fillable = [
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LevelProgressionEntry::class, 'version_id');
    }

    public function adventures(): HasMany
    {
        return $this->hasMany(Adventure::class, 'progression_version_id');
    }
}
