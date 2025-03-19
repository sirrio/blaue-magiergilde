<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property mixed $duration
 * @property mixed $title
 * @property mixed $user_id
 * @property mixed $start_date
 * @property mixed $has_additional_bubble
 * @property mixed $sessions
 * @property mixed $notes
 * @property mixed $tier
 */
class Game extends Model
{
  use HasFactory, SoftDeletes;

  protected $casts = [
    'has_additional_bubble' => 'boolean'
  ];
}
