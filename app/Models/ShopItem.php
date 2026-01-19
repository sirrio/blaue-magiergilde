<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopItem extends Model
{
    protected $table = 'item_shop';

    protected $fillable = [
        'shop_id',
        'item_id',
        'item_name',
        'item_url',
        'item_cost',
        'item_rarity',
        'item_type',
        'snapshot_custom',
        'spell_id',
        'spell_name',
        'spell_url',
        'spell_legacy_url',
        'spell_level',
        'spell_school',
        'notes',
    ];

    protected $casts = [
        'snapshot_custom' => 'boolean',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function spell(): BelongsTo
    {
        return $this->belongsTo(Spell::class);
    }
}
