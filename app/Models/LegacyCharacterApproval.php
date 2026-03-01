<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LegacyCharacterApproval extends Model
{
    /** @use HasFactory<\Database\Factories\LegacyCharacterApprovalFactory> */
    use HasFactory;

    protected $fillable = [
        'discord_name',
        'player_name',
        'room',
        'tier',
        'character_name',
        'external_link',
        'dndbeyond_character_id',
        'source_row',
        'source_column',
    ];
}
