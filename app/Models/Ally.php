<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property mixed $name
 * @property mixed $character_id
 * @property mixed|string $standing
 */
class Ally extends Model
{
    use HasFactory;

    public function adventures(): BelongsToMany
    {
        return $this->belongsToMany(Adventure::class);
    }
}
