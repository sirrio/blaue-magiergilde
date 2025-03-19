<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property integer $duration
 * @property integer $character_id
 * @property string $game_master
 * @property string $title
 * @property mixed $start_date
 * @property mixed $has_additional_bubble
 * @property mixed $notes
 */
class Adventure extends Model
{
  use HasFactory, SoftDeletes;

  protected $casts = [
    'has_additional_bubble' => 'boolean'
  ];
}
