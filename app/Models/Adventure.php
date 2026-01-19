<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $duration
 * @property int $character_id
 * @property string $game_master
 * @property string $title
 * @property mixed $start_date
 * @property mixed $has_additional_bubble
 * @property bool $is_pseudo
 * @property mixed $notes
 */
class Adventure extends Model
{
    use HasFactory, SoftDeletes;

    protected $attributes = [
        'is_pseudo' => false,
    ];

    protected $casts = [
        'has_additional_bubble' => 'boolean',
        'deleted_by_character' => 'boolean',
        'is_pseudo' => 'boolean',
    ];

    public function allies(): BelongsToMany
    {
        return $this->belongsToMany(Ally::class);
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
