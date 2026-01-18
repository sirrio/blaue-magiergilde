<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property mixed $is_admin
 * @property mixed $event_bubbles
 * @property mixed $event_coins
 * @property mixed $bt_bubbles
 * @property mixed $bt_coins
 * @property mixed $lt_bubbles
 * @property mixed $lt_coins
 * @property mixed $ht_bubbles
 * @property mixed $ht_coins
 * @property mixed $et_bubbles
 * @property mixed $et_coins
 * @property mixed $other_bubbles
 * @property mixed $other_coins
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'discord_id',
        'name',
        'email',
        'password',
        'avatar',
        'simplified_tracking',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'simplified_tracking' => 'boolean',
        ];
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }
}
