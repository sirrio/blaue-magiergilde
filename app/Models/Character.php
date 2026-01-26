<?php

namespace App\Models;

use App\Support\FactionRankCalculator;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property numeric $id
 * @property string $name
 * @property string $external_link
 * @property string $start_tier
 * @property string $version
 * @property int $user_id
 * @property string $avatar
 * @property mixed $dm_bubbles
 * @property mixed $dm_coins
 * @property mixed $bubble_shop_spend
 * @property mixed $is_filler
 * @property mixed $faction
 * @property mixed $notes
 * @property bool $admin_managed
 */
class Character extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The relationships that should always be loaded.
     *
     * @var array
     */
    protected $with = ['allies.linkedCharacter', 'downtimes', 'characterClasses'];

    protected $casts = [
        'is_filler' => 'boolean',
        'admin_managed' => 'boolean',
    ];

    protected $appends = ['faction_rank'];

    public function allies(): HasMany
    {
        return $this->hasMany(Ally::class)->orderBy('name');
    }

    public function adventures(): HasMany
    {
        return $this->hasMany(Adventure::class);
    }

    public function downtimes(): HasMany
    {
        return $this->hasMany(Downtime::class);
    }

    public function shopPurchases(): HasMany
    {
        return $this->hasMany(CharacterShopPurchase::class)->latest();
    }

    public function characterClasses(): BelongsToMany
    {
        return $this->belongsToMany(CharacterClass::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function room(): HasOne
    {
        return $this->hasOne(Room::class);
    }

    public function getFactionRankAttribute(): int
    {
        return (new FactionRankCalculator)->calculate($this);
    }
}
