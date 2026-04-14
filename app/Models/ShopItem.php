<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopItem extends Model
{
    protected $table = 'item_shop';

    protected $fillable = [
        'shop_id',
        'item_id',
        'item_name',
        'item_url',
        'item_cost',
        'item_rarity',
        'item_type',
        'item_ruling_changed',
        'item_ruling_note',
        'roll_source_kind',
        'roll_rule_id',
        'source_shortcode',
        'snapshot_custom',
        'spell_id',
        'spell_name',
        'spell_url',
        'spell_legacy_url',
        'spell_level',
        'spell_school',
        'spell_ruling_changed',
        'spell_ruling_note',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_custom' => 'boolean',
            'item_ruling_changed' => 'boolean',
            'spell_ruling_changed' => 'boolean',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function spell(): BelongsTo
    {
        return $this->belongsTo(Spell::class);
    }

    public function rollRule(): BelongsTo
    {
        return $this->belongsTo(ShopRollRule::class, 'roll_rule_id');
    }
}
