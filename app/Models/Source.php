<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Source extends Model
{
    /** @use HasFactory<\Database\Factories\SourceFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'shortcode',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function spells(): HasMany
    {
        return $this->hasMany(Spell::class);
    }
}
