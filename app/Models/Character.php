<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property numeric $id
 * @property string $name
 * @property string $external_link
 * @property string $start_tier
 * @property string $version
 * @property integer $user_id
 * @property string $avatar
 * @property mixed $dm_bubbles
 * @property mixed $dm_coins
 * @property mixed $bubble_shop_spend
 * @property mixed $is_filler
 * @property mixed $faction
 * @property mixed $notes
 */
class Character extends Model
{
  use HasFactory, SoftDeletes;

  /**
   * The relationships that should always be loaded.
   *
   * @var array
   */
  protected $with = ['allies', 'downtimes', 'characterClasses'];

  protected $casts = [
    'is_filler' => 'boolean'
  ];

  public function allies(): HasMany
  {
    return $this->hasMany(Ally::class)->orderBy('name');
  }

  public function adventures(): HasMany
  {
    return $this->hasMany(Adventure::class);
  }

  public function downtimes(): HasMany
  {
    return $this->hasMany(Downtime::class);
  }

  public function characterClasses(): BelongsToMany
  {
    return $this->belongsToMany(CharacterClass::class);
  }
}
