<?php

namespace App\Models;

use Database\Factories\ShopFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Models\ItemShop;

class Shop extends Model
{
    /** @use HasFactory<ShopFactory> */
    use HasFactory;

    public function items(): BelongsToMany
    {
        return $this->belongsToMany(Item::class)
            ->using(ItemShop::class)
            ->withPivot('spell_id');
    }
}
