<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Spell extends Model
{
    /** @use HasFactory<\Database\Factories\SpellsFactory> */
    use HasFactory, SoftDeletes;

    protected $casts = [
        'ruling_changed' => 'boolean',
    ];

    public function source(): BelongsTo
    {
        return $this->belongsTo(Source::class);
    }
}
