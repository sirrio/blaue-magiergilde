<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property mixed $name
 * @property mixed $character_id
 * @property mixed $rating
 * @property mixed $linked_character_id
 */
class Ally extends Model
{
    use HasFactory;

    protected $casts = [
        'rating' => 'integer',
    ];

    public function adventures(): BelongsToMany
    {
        return $this->belongsToMany(Adventure::class);
    }

    public function linkedCharacter(): BelongsTo
    {
        return $this->belongsTo(Character::class, 'linked_character_id');
    }
}
