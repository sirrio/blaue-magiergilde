<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CharacterShopPurchase extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'character_id',
        'type',
        'cost',
    ];

    protected $casts = [
        'cost' => 'integer',
    ];

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
