<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property mixed $name
 * @property mixed $url
 * @property mixed $cost
 * @property mixed $rarity
 * @property mixed $type
 */
class Item extends Model
{
  use HasFactory, SoftDeletes;
}
