<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuctionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'auction_id',
        'item_id',
        'notes',
        'repair_current',
        'repair_max',
        'remaining_auctions',
    ];

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(AuctionBid::class);
    }

    public function hiddenBids(): HasMany
    {
        return $this->hasMany(AuctionHiddenBid::class);
    }
}
