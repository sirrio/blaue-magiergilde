<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property mixed $duration
 * @property mixed $character_id
 * @property mixed $start_date
 * @property mixed $notes
 * @property mixed $type
 */
class Downtime extends Model
{
  use HasFactory, SoftDeletes;
}
