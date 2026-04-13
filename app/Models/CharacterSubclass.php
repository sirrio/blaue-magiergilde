<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterSubclass extends Model
{
    use HasFactory;

    protected $fillable = ['character_class_id', 'name', 'source_id', 'guild_enabled'];

    protected function casts(): array
    {
        return [
            'guild_enabled' => 'boolean',
        ];
    }

    public function characterClass(): BelongsTo
    {
        return $this->belongsTo(CharacterClass::class);
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(Source::class);
    }
}
