<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackstockItem extends Model
{
    protected $fillable = [
        'item_id',
        'item_name',
        'item_url',
        'item_cost',
        'item_rarity',
        'item_type',
        'notes',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
