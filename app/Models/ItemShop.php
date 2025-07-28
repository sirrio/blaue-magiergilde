<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemShop extends Pivot
{
    public function spell(): BelongsTo
    {
        return $this->belongsTo(Spell::class);
    }
}
