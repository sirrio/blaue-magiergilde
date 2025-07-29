<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Registration extends Model
{
    use HasFactory;

    protected $fillable = [
        'character_name',
        'character_url',
        'start_tier',
        'tier',
        'discord_name',
        'notes',
        'status',
    ];
}
