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
 * @property int|null $target_level
 * @property int|null $progression_version_id
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
        'target_level' => 'integer',
        'progression_version_id' => 'integer',
    ];

    public function allies(): BelongsToMany
    {
        return $this->belongsToMany(Ally::class);
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function progressionVersion(): BelongsTo
    {
        return $this->belongsTo(LevelProgressionVersion::class, 'progression_version_id');
    }
}
