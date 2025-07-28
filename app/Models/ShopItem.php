<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopItem extends Model
{
    protected $table = 'item_shop';
    protected $fillable = ['shop_id','item_id','spell_id'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function spell(): BelongsTo
    {
        return $this->belongsTo(Spell::class);
    }
}
