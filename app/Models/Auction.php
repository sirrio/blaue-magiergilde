<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Auction extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'status',
        'currency',
        'posted_at',
        'voice_channel_id',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
        'voice_updated_at' => 'datetime',
        'voice_candidates' => 'array',
    ];

    public function auctionItems(): HasMany
    {
        return $this->hasMany(AuctionItem::class);
    }
}
