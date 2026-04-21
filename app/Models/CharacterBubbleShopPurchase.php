<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterBubbleShopPurchase extends Model
{
    /** @use HasFactory<\Database\Factories\CharacterBubbleShopPurchaseFactory> */
    use HasFactory;

    protected $fillable = [
        'character_id',
        'type',
        'quantity',
        'details',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'details' => 'array',
        ];
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
