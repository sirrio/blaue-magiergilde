<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MundaneItemVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'category',
        'cost_gp',
        'is_placeholder',
        'guild_enabled',
    ];

    protected function casts(): array
    {
        return [
            'cost_gp' => 'decimal:2',
            'is_placeholder' => 'boolean',
            'guild_enabled' => 'boolean',
        ];
    }

    public function items(): BelongsToMany
    {
        return $this->belongsToMany(Item::class, 'item_mundane_variant');
    }
}
