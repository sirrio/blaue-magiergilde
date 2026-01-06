<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionHiddenBid extends Model
{
    use HasFactory;

    protected $fillable = [
        'auction_item_id',
        'bidder_discord_id',
        'bidder_name',
        'max_amount',
    ];

    public function auctionItem(): BelongsTo
    {
        return $this->belongsTo(AuctionItem::class);
    }
}
