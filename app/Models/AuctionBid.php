<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionBid extends Model
{
    use HasFactory;

    protected $fillable = [
        'auction_item_id',
        'bidder_name',
        'amount',
        'created_by',
    ];

    public function auctionItem(): BelongsTo
    {
        return $this->belongsTo(AuctionItem::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
