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
        'item_name',
        'item_url',
        'item_cost',
        'item_rarity',
        'item_type',
        'snapshot_custom',
        'notes',
        'repair_current',
        'repair_max',
        'remaining_auctions',
    ];

    protected $casts = [
        'snapshot_custom' => 'boolean',
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
