<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class CharacterClass extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'source_id', 'guild_enabled'];

    protected function casts(): array
    {
        return [
            'guild_enabled' => 'boolean',
        ];
    }

    public function characters(): BelongsToMany
    {
        return $this->belongsToMany(Character::class);
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(Source::class);
    }

    public function subclasses(): HasMany
    {
        return $this->hasMany(CharacterSubclass::class);
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(CompendiumComment::class, 'commentable');
    }
}
