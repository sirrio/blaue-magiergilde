<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BotOperation extends Model
{
    protected $table = 'bot_operations';

    public const RESOURCE_SHOP = 'shop';

    public const RESOURCE_AUCTION = 'auction';

    public const RESOURCE_BACKSTOCK = 'backstock';

    public const ACTION_PUBLISH_DRAFT = 'publish_draft';

    public const ACTION_UPDATE_CURRENT_POST = 'update_current_post';

    public const ACTION_POST_AUCTION = 'post_auction';

    public const ACTION_POST_BACKSTOCK = 'post_backstock';

    public const STATUS_PENDING = 'pending';

    public const STATUS_POSTING_TO_DISCORD = 'posting_to_discord';

    public const STATUS_ROTATING_POINTERS = 'rotating_pointers';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'resource',
        'resource_id',
        'action',
        'status',
        'step',
        'user_id',
        'channel_id',
        'shop_id',
        'result_shop_id',
        'current_shop_id',
        'draft_shop_id',
        'error',
        'meta',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'resource_id' => 'integer',
        'meta' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function resultShop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'result_shop_id');
    }

    public function currentShop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'current_shop_id');
    }

    public function draftShop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'draft_shop_id');
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_COMPLETED, self::STATUS_FAILED], true);
    }
}
